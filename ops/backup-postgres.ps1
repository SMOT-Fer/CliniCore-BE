param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,

    [string]$OutputDir = ".\\backups",

    [int]$KeepLast = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $OutputDir)) {
    New-Item -Path $OutputDir -ItemType Directory | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$fileName = "estudio-backup-$timestamp.sql"
$filePath = Join-Path $OutputDir $fileName

Write-Host "Creando backup en $filePath"
$env:DATABASE_URL = $DatabaseUrl

pg_dump --dbname=$env:DATABASE_URL --format=plain --no-owner --no-privileges --file="$filePath"

Write-Host "Backup completado"

$files = Get-ChildItem -Path $OutputDir -Filter "estudio-backup-*.sql" | Sort-Object LastWriteTime -Descending
if ($files.Count -gt $KeepLast) {
    $files | Select-Object -Skip $KeepLast | Remove-Item -Force
    Write-Host "Backups antiguos eliminados, se conservan los últimos $KeepLast"
}
