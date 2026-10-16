# Conecta este proyecto con Supabase en la nube SIN pegar secretos en el chat.
# Uso (en la terminal de VS Code):  pnpm supabase:conectar
#
# Pide el access token y la contraseña de la BD de forma oculta, enlaza el proyecto,
# obtiene las API keys y escribe .env.local (archivo ignorado por git).

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Leer-Secreto([string]$mensaje) {
  $s = Read-Host $mensaje -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host ""
Write-Host "=== Conectar con Supabase ===" -ForegroundColor Cyan

# 1. Access token
$token = Leer-Secreto "1/3  Pegue su access token de Supabase (sbp_...) y presione Enter"
if (-not $token.StartsWith("sbp_")) { throw "El token debe empezar con sbp_ (Account → Access Tokens)." }
$env:SUPABASE_ACCESS_TOKEN = $token
pnpm exec supabase login --token $token | Out-Null
Write-Host "     Token válido." -ForegroundColor Green

# 2. Proyecto
Write-Host ""
Write-Host "Sus proyectos:" -ForegroundColor Cyan
pnpm exec supabase projects list
$ref = (Read-Host "2/3  Escriba el REFERENCE ID del proyecto a usar").Trim()
if ($ref -notmatch '^[a-z0-9]{20}$') { throw "El Reference ID tiene 20 letras/números (columna REFERENCE ID)." }

# 3. Contraseña de la base de datos
$dbPass = Leer-Secreto "3/3  Contraseña de la base de datos (la que puso al crear el proyecto)"
$env:SUPABASE_DB_PASSWORD = $dbPass
pnpm exec supabase link --project-ref $ref --password $dbPass
if ($LASTEXITCODE -ne 0) { throw "No se pudo enlazar. Revise la contraseña de la BD (Project Settings → Database → Reset password)." }

# API keys
$keys = (pnpm exec supabase projects api-keys --project-ref $ref --reveal -o json | Out-String) | ConvertFrom-Json
$anon = ($keys | Where-Object { $_.name -eq "anon" } | Select-Object -First 1).api_key
$service = ($keys | Where-Object { $_.name -eq "service_role" } | Select-Object -First 1).api_key
if (-not $anon -or -not $service) { throw "No se encontraron las claves anon/service_role del proyecto." }

# Conservar valores opcionales existentes de .env.local
$extra = @()
if (Test-Path .env.local) {
  $extra = Get-Content .env.local | Where-Object { $_ -match '^CONSULTA_DOC_' }
}
if (-not $extra) { $extra = @("CONSULTA_DOC_TOKEN=", "CONSULTA_DOC_URL=https://api.apis.net.pe/v2") }

$contenido = @(
  "# Generado por scripts/conectar-supabase.ps1 — NO subir a git",
  "NEXT_PUBLIC_SUPABASE_URL=https://$ref.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon",
  "SUPABASE_SERVICE_ROLE_KEY=$service",
  "",
  "# Para que la CLI (pnpm sb ...) funcione sin volver a pedir datos",
  "SUPABASE_ACCESS_TOKEN=$token",
  "SUPABASE_DB_PASSWORD=$dbPass",
  "SUPABASE_PROJECT_REF=$ref",
  ""
) + $extra
[IO.File]::WriteAllText((Join-Path (Get-Location) ".env.local"), ($contenido -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))

Write-Host ""
Write-Host "Listo: proyecto $ref enlazado y .env.local creado." -ForegroundColor Green
Write-Host "Avísele a Claude: 'ya está conectado'." -ForegroundColor Green
