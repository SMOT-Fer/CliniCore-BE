param(
    [string]$Url = "http://127.0.0.1:3000/readyz"
)

$ErrorActionPreference = "Stop"

$response = Invoke-RestMethod -Uri $Url -Method Get
if ($response.success -ne $true -or $response.data.status -ne "ready") {
    Write-Error "Healthcheck falló"
    exit 1
}

Write-Host "Healthcheck OK"
exit 0
