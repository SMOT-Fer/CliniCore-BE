param(
    [string]$Repo,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCommand) {
    $ghFallbackPath = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $ghFallbackPath) {
        $ghCommand = @{ Source = $ghFallbackPath }
    }
}

if (-not $ghCommand) {
    throw "GitHub CLI (gh) no esta instalado. Instalalo y ejecuta: gh auth login"
}

$gh = $ghCommand.Source

if (-not $Repo) {
    $Repo = & $gh repo view --json nameWithOwner --jq ".nameWithOwner"
}

if (-not $Repo) {
    throw "No se pudo resolver el repositorio. Pasa -Repo owner/repo"
}

$checks = @(
    @{ context = "test" },
    @{ context = "docker-build" },
    @{ context = "codeql" },
    @{ context = "secrets-scan" }
)

$body = @{
    required_status_checks = @{
        strict = $true
        checks = $checks
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $true
        required_approving_review_count = 1
    }
    restrictions = $null
    required_conversation_resolution = $true
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_linear_history = $false
}

$jsonBody = $body | ConvertTo-Json -Depth 10

Write-Host "Aplicando branch protection en $Repo ($Branch)..."
$jsonBody | & $gh api --method PUT "repos/$Repo/branches/$Branch/protection" --input -

if ($LASTEXITCODE -ne 0) {
    throw "No se pudo aplicar branch protection automaticamente. Verifica permisos/plan del repositorio."
}

Write-Host "Branch protection aplicada correctamente."
Write-Host "Recuerda configurar en GitHub Environment 'production' y secrets de deploy."