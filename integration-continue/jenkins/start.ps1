$ErrorActionPreference = 'Stop'
$compose = Join-Path $PSScriptRoot 'compose.yaml'
$state = Join-Path $PSScriptRoot '.state'
$sonarUrl = 'http://127.0.0.1:19000'
$projectKey = 'souverainrecrut-backend'

function Get-LabPassword([string]$name) {
    $path = Join-Path $state $name
    if (-not (Test-Path -LiteralPath $path)) {
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $password = [Convert]::ToBase64String($bytes) + 'aA9!'
        [IO.File]::WriteAllText($path, $password)
    }
    [IO.File]::ReadAllText($path)
}

function Get-AdminHeader([string]$password) {
    $basic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin:$password"))
    @{ Authorization = "Basic $basic" }
}

New-Item -ItemType Directory -Force -Path $state | Out-Null
$jenkinsPassword = Get-LabPassword 'jenkins_password'
$sonarPassword = Get-LabPassword 'sonar_password'
docker compose -f $compose up -d sonarqube
if ($LASTEXITCODE) { throw 'Démarrage de SonarQube impossible.' }

$timeout = (Get-Date).AddMinutes(5)
do {
    try { $status = (Invoke-RestMethod "$sonarUrl/api/system/status" -TimeoutSec 5).status }
    catch { $status = 'STARTING' }
    if ($status -eq 'UP') { break }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $timeout)
if ($status -ne 'UP') { throw "SonarQube indisponible ($status). Vérifier docker compose logs sonarqube." }

$headers = Get-AdminHeader $sonarPassword
if (-not (Invoke-RestMethod "$sonarUrl/api/authentication/validate" -Headers $headers).valid) {
    $initial = Get-AdminHeader 'admin'
    Invoke-RestMethod "$sonarUrl/api/users/change_password" -Method Post -Headers $initial -Body @{
        login = 'admin'; previousPassword = 'admin'; password = $sonarPassword
    } | Out-Null
}

$projects = Invoke-RestMethod "$sonarUrl/api/projects/search?projects=$projectKey" -Headers $headers
if (-not $projects.components) {
    Invoke-RestMethod "$sonarUrl/api/projects/create" -Method Post -Headers $headers -Body @{
        project = $projectKey; name = 'SouverainRecrut Backend'; mainBranch = 'Dev'
    } | Out-Null
}

$gate = 'SouverainRecrut CI'
$gates = Invoke-RestMethod "$sonarUrl/api/qualitygates/list" -Headers $headers
if ($gate -notin $gates.qualitygates.name) {
    Invoke-RestMethod "$sonarUrl/api/qualitygates/copy" -Method Post -Headers $headers -Body @{
        sourceName = 'Sonar way'; name = $gate
    } | Out-Null
}
$quality = Invoke-RestMethod "$sonarUrl/api/qualitygates/show?name=$([uri]::EscapeDataString($gate))" -Headers $headers
if ('coverage' -notin $quality.conditions.metric) {
    Invoke-RestMethod "$sonarUrl/api/qualitygates/create_condition" -Method Post -Headers $headers -Body @{
        gateName = $gate; metric = 'coverage'; op = 'LT'; error = '80'
    } | Out-Null
}
Invoke-RestMethod "$sonarUrl/api/qualitygates/select" -Method Post -Headers $headers -Body @{
    gateName = $gate; projectKey = $projectKey
} | Out-Null

$tokenPath = Join-Path $state 'sonar_token'
$newToken = $true
if (Test-Path -LiteralPath $tokenPath) {
    $tokenHeaders = @{ Authorization = 'Bearer ' + [IO.File]::ReadAllText($tokenPath) }
    try { $newToken = -not (Invoke-RestMethod "$sonarUrl/api/authentication/validate" -Headers $tokenHeaders).valid }
    catch { $newToken = $true }
}
if ($newToken) {
    $token = Invoke-RestMethod "$sonarUrl/api/user_tokens/generate" -Method Post -Headers $headers -Body @{
        name = "jenkins-local-$([Guid]::NewGuid())"; type = 'PROJECT_ANALYSIS_TOKEN'; projectKey = $projectKey
    }
    [IO.File]::WriteAllText($tokenPath, $token.token)
}

docker compose -f $compose up -d --build jenkins
if ($LASTEXITCODE) { throw 'Démarrage de Jenkins impossible.' }
$jenkinsHeaders = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("tp-admin:$jenkinsPassword")) }
$timeout = (Get-Date).AddMinutes(5)
do {
    try {
        $job = Invoke-RestMethod 'http://127.0.0.1:18080/job/souverainrecrut-Dev/api/json?tree=name' -Headers $jenkinsHeaders -TimeoutSec 5
        if ($job.name -eq 'souverainrecrut-Dev') { break }
    } catch { }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $timeout)
if ($job.name -ne 'souverainrecrut-Dev') { throw 'Job Jenkins indisponible. Vérifier docker compose logs jenkins.' }
Write-Host 'Jenkins : http://127.0.0.1:18080/  |  SonarQube : http://127.0.0.1:19000/'
