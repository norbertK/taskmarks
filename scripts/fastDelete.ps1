
param ([Parameter(Mandatory)]$directory)


Write-Output "Hello $directory"

$timeStr = get-date -f 'yyyy-MM-dd-HHmmss' 

Write-Output $timeStr

$newPath = $directory + '.' + $timeStr
Write-Output $newPath + ' - starting to delete'

Rename-Item -Path "$directory" -NewName "$newPath"

Remove-Item  "$newPath" -Force -Recurse

Write-Output ' - done -'

# Read-Host
