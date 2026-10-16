# Actualiza solo SUPABASE_DB_PASSWORD en .env.local (entrada oculta) y prueba la conexión.
# Uso: pnpm supabase:clave
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$s = Read-Host "Nueva contrasena de la base de datos" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
try { $clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$lineas = Get-Content .env.local | ForEach-Object { if ($_ -match '^SUPABASE_DB_PASSWORD=') { "SUPABASE_DB_PASSWORD=$clave" } else { $_ } }
[IO.File]::WriteAllText((Join-Path (Get-Location) ".env.local"), ($lineas -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host "Probando conexion..." -ForegroundColor Cyan
node scripts/supabase.mjs migration list
if ($LASTEXITCODE -eq 0) { Write-Host "Conexion OK. Avisele a Claude." -ForegroundColor Green }
else { Write-Host "Sigue fallando: espere 1-2 minutos tras el reset y vuelva a intentar." -ForegroundColor Yellow }
