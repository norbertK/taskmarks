# Taskmarks Architecture

Technical overview of the VS Code extension for persistent, task-based bookmarks.

## File Structure

The extension is organized into three layers:

```
src/
├── extension.ts          # Entry point, command registration
├── Helper.ts             # VS Code event coordination
├── DecoratorHelper.ts    # Editor gutter icons
│
├── TaskManager.ts        # Singleton task orchestrator
│
├── Task.ts               # Task with Ring of files
├── File.ts               # File with array of marks
├── Mark.ts               # Single bookmark (line + label)
├── Ring.ts               # Circular array for navigation
│
├── Persist.ts            # JSON save/load operations
├── PathHelper.ts         # Path manipulation, file I/O
├── types.ts              # TypeScript interfaces
│
└── core/                 # Pure modules (no VS Code deps)
    ├── navigation.ts     # Mark navigation logic
    ├── serialization.ts  # JSON format conversion
    └── paths.ts          # Path utilities
```

**Layers:**
- **VS Code Integration**: `extension.ts`, `Helper.ts`, `DecoratorHelper.ts`
- **Business Logic**: `TaskManager.ts`
- **Data Structures**: `Task.ts`, `File.ts`, `Mark.ts`, `Ring.ts`
- **Persistence**: `Persist.ts`, `PathHelper.ts`
- **Pure Core**: `core/*.ts` (testable without VS Code)

---

## Class Hierarchy

```mermaid
classDiagram
    TaskManager "1" --> "*" Task : _allTasks
    Task "1" --> "1" Ring~File~ : _files
    Task "1" --> "0..1" File : _activeFile
    File "1" --> "*" Mark : _marks
    
    Helper ..> TaskManager : uses
    Helper ..> DecoratorHelper : uses
    Helper ..> Persist : uses
    
    Persist ..> TaskManager : reads/writes
    Persist ..> PathHelper : uses
    
    class TaskManager {
        -_instance: TaskManager
        -_activeTask: Task
        -_allTasks: Task[]
        -_statusBarItem: StatusBarItem
        +instance: TaskManager
        +useActiveTask(name): Task
        +nextMark(line): void
        +previousMark(line): void
    }
    
    class Task {
        -_name: string
        -_files: Ring~File~
        -_activeFile: File
        +toggle(filename, line, label): void
        +use(path): File
        +lineHasMark(filename, line): boolean
    }
    
    class File {
        -_filepath: string
        -_marks: Mark[]
        +toggleTaskMark(mark): void
        +hasMark(line): boolean
        +lineNumbers: number[]
    }
    
    class Mark {
        -_filepath: string
        -_lineNumber: number
        -_label: string
        +getQuickPickItem(): QuickPickItem
    }
    
    class Ring~T~ {
        -_current: number
        +next: T
        +previous: T
        +push(item): number
        +delete(item): boolean
    }
```

---

## Data Flow: Toggle Bookmark

When a user presses `Ctrl+Alt+M`:

```mermaid
sequenceDiagram
    participant VSCode as VS Code
    participant Ext as extension.ts
    participant H as Helper
    participant TM as TaskManager
    participant T as Task
    participant F as File
    participant P as Persist
    participant DH as DecoratorHelper

    VSCode->>Ext: toggleMark command
    Ext->>H: toggleMark()
    H->>TM: activeTask
    TM-->>H: Task
    H->>T: toggle(filename, line, label)
    T->>F: toggleTaskMark(mark)
    F->>F: splice or push Mark
    H->>P: saveTaskmarksJson()
    P->>P: JSON.stringify()
    P->>P: writeFileSync()
    H->>DH: refresh(editor, lineNumbers)
    DH->>VSCode: setDecorations()
```

---

## Data Flow: Line Change Tracking

When document content changes, mark positions are automatically adjusted:

```mermaid
flowchart LR
    A[onDidChangeTextDocument] --> B{Lines changed?}
    B -->|No| Z[Done]
    B -->|Yes| C[Calculate diffLine]
    C --> D[For each mark after change]
    D --> E[mark.lineNumber += diffLine]
    E --> F[Persist.saveTaskmarksJson]
    F --> G[DecoratorHelper.refresh]
```

**Code location**: `Helper.initChangeHandler()` (lines 89-130)

```typescript
const diffLine = event.document.lineCount - lastLineCount;
allMarks.forEach((mark) => {
    if (mark.lineNumber > startLine) {
        mark.lineNumber = mark.lineNumber + diffLine;
    }
});
```

---

## The Ring Structure

Files within a task are stored in a `Ring<File>`, enabling circular navigation:

```
        ┌─────────┐
        │ File A  │
        └────┬────┘
             │
    ┌────────┴────────┐
    │                 │
┌───┴───┐         ┌───┴───┐
│File D │◄───────►│File B │ ◄── current
└───┬───┘         └───┬───┘
    │                 │
    └────────┬────────┘
             │
        ┌────┴────┐
        │ File C  │
        └─────────┘

.next     → moves clockwise
.previous → moves counter-clockwise
```

**Navigation logic** (in `TaskManager`):
1. `findNextMark()` looks for next line in current file
2. If none found → `nextDocument()` advances the Ring
3. Opens the next file with marks at its first mark

---

## Persistence Format

Data is stored in `.vscode/taskmarks.json`:

```typescript
interface IPersistTaskManager {
    activeTaskName: string;
    persistTasks: IPersistTask[];
}

interface IPersistTask {
    name: string;
    persistFiles: IPersistFile[];
}

interface IPersistFile {
    filepath: string;        // relative to workspace
    persistMarks: IPersistMark[];
}

interface IPersistMark {
    lineNumber: number;
    label: string;
}
```

**Example:**
```json
{
  "activeTaskName": "feature-auth",
  "persistTasks": [
    {
      "name": "feature-auth",
      "persistFiles": [
        {
          "filepath": "\\src\\auth\\login.ts",
          "persistMarks": [
            { "lineNumber": 42, "label": "TODO: validate token" },
            { "lineNumber": 87, "label": "" }
          ]
        }
      ]
    }
  ]
}
```

---

## Initialization Sequence

```mermaid
sequenceDiagram
    participant VSCode
    participant Ext as extension.ts
    participant H as Helper
    participant PH as PathHelper
    participant TM as TaskManager
    participant P as Persist
    participant DH as DecoratorHelper

    VSCode->>Ext: activate(context)
    Ext->>H: init(context, outputChannel)
    H->>PH: basePath = workspace.uri.fsPath
    H->>TM: TaskManager.instance
    TM->>TM: new TaskManager()
    H->>P: initAndLoad(taskManager, context)
    P->>PH: getTaskmarksJson()
    PH-->>P: JSON string
    P->>P: parseTaskmarksJson()
    P->>P: normalizeFilePaths()
    P->>TM: addTask() for each
    H->>DH: initDecorator(context)
    H->>H: initActiveEditorChangeHandler()
    H->>H: initSaveHandler()
    H->>H: initChangeHandler()
    Ext->>VSCode: register all commands
```

---

## Available Commands

| Command | Keybinding | Handler |
|---------|------------|---------|
| `toggleMark` | `Ctrl+Alt+M` | `Helper.toggleMark()` |
| `nextMark` | `Ctrl+Alt+N` | `Helper.nextMark()` |
| `previousMark` | `Ctrl+Alt+P` | `Helper.previousMark()` |
| `selectTask` | `Ctrl+Alt+T` | `Helper.selectTask()` |
| `createTask` | - | `Helper.createTask()` |
| `renameTask` | - | `Helper.renameTask()` |
| `deleteTask` | - | `Helper.deleteTask()` |
| `selectMarkFromList` | - | `Helper.selectMarkFromList()` |
| `copyToClipboard` | - | `Persist.copyToClipboard()` |
| `pasteFromClipboard` | - | `Persist.pasteFromClipboard()` |

---

## Pure Core Modules

The `core/` directory contains pure functions with no VS Code dependencies, enabling easier testing.

### core/navigation.ts

```typescript
findNextMark(currentLine: number, lineNumbers: number[]): number | undefined
findPreviousMark(currentLine: number, lineNumbers: number[]): number | undefined
findNextFileWithMarks(files, currentIndex): { filepath, lineNumber } | undefined
findPreviousFileWithMarks(files, currentIndex): { filepath, lineNumber } | undefined
```

### core/serialization.ts

```typescript
parseTaskmarksJson(json: string): IPersistTaskManager | null
taskToPersistTask(task, fileExistsCheck): IPersistTask
persistTaskToTask(persistTask): SerializableTask
normalizeFilePaths(persistTaskManager, fromChar, toChar): IPersistTaskManager
```

### core/paths.ts

```typescript
detectPathCharacters(path): { active: string, inactive: string }
getFullPath(basePath, filepath): string
reducePath(basePath, filepath): string
normalizePath(filepath, fromChar, toChar): string
```

---

## Key Design Decisions

1. **Singleton TaskManager**: Single source of truth for all task state
2. **Ring for file navigation**: Circular structure enables seamless prev/next across files
3. **Relative paths**: Stored paths are workspace-relative for portability
4. **Auto-save on document save**: Marks persist automatically
5. **Line tracking**: Marks adjust when lines are inserted/deleted above them
6. **Pure core modules**: Business logic separated from VS Code APIs for testability
