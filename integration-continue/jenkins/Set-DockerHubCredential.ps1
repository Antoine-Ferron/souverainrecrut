param([Parameter(Mandatory)][string]$Username)

$ErrorActionPreference = 'Stop'
$jenkins = 'http://127.0.0.1:18080'
$domain = "$jenkins/credentials/store/system/domain/_"
$labPassword = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '.state/jenkins_password'))
$headers = @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("tp-admin:$labPassword")) }
$crumb = Invoke-RestMethod "$jenkins/crumbIssuer/api/json" -Headers $headers -SessionVariable session -MaximumRedirection 0
$headers[$crumb.crumbRequestField] = $crumb.crumb
$entries = Invoke-RestMethod "$domain/api/json?tree=credentials%5Bid%5D" -WebSession $session -Headers $headers -MaximumRedirection 0
$endpoint = if ('dockerhub' -in $entries.credentials.id) { "$domain/credential/dockerhub/config.xml" } else { "$domain/createCredentials" }

$secure = Read-Host 'Jeton Docker Hub de publication (saisie masquée)' -AsSecureString
if ($secure.Length -eq 0) { throw 'Aucun jeton saisi.' }
try {
    $token = [Net.NetworkCredential]::new('', $secure).Password
    $body = "<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl><scope>GLOBAL</scope><id>dockerhub</id><username>$([Security.SecurityElement]::Escape($Username))</username><password>$([Security.SecurityElement]::Escape($token))</password></com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>"
    try {
        Invoke-RestMethod $endpoint -Method Post -ContentType 'application/xml; charset=utf-8' -Body $body -Headers $headers -WebSession $session -MaximumRedirection 0 | Out-Null
    } catch {
        throw "Jenkins a refusé l'enregistrement du credential dockerhub."
    }
} finally {
    $secure.Dispose()
    Remove-Variable token, body -ErrorAction SilentlyContinue
}
Write-Host 'Credential dockerhub enregistré dans Jenkins.'
