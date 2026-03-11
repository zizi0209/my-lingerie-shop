param(
    [string]$DumpPath = "railway-old.dump",
    [string]$PostgresImage = "postgres:17"
)

if (-not $env:NEW_DB_URL) {
    Write-Error "Thiếu biến môi trường NEW_DB_URL. Hãy set trước khi chạy script."
    exit 1
}

$resolvedDump = Resolve-Path -Path $DumpPath -ErrorAction SilentlyContinue
if (-not $resolvedDump) {
    Write-Error "Không tìm thấy file dump: $DumpPath"
    exit 1
}

$dumpInfo = Get-Item -Path $resolvedDump
if ($dumpInfo.Length -le 0) {
    Write-Error "File dump rỗng: $resolvedDump"
    exit 1
}

$dumpDir = $dumpInfo.Directory.FullName
$dumpFile = $dumpInfo.Name

Write-Host "Preflight dump..."
$preflightArgs = @(
    "run", "--rm",
    "-v", "$dumpDir:/work",
    $PostgresImage,
    "sh", "-c",
    "pg_restore --list /work/$dumpFile"
)
& docker @preflightArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Preflight thất bại. Dừng restore."
    exit $LASTEXITCODE
}

Write-Host "Restore dump..."
$restoreArgs = @(
    "run", "--rm",
    "-v", "$dumpDir:/work",
    "-e", "DATABASE_URL=$env:NEW_DB_URL",
    $PostgresImage,
    "sh", "-c",
    "pg_restore --no-owner --no-privileges --clean --if-exists -d `"$DATABASE_URL`" /work/$dumpFile"
)
& docker @restoreArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Restore thất bại."
    exit $LASTEXITCODE
}

Write-Host "Verify kết nối DB..."
$verifyArgs = @(
    "run", "--rm",
    "-e", "DATABASE_URL=$env:NEW_DB_URL",
    $PostgresImage,
    "sh", "-c",
    "psql `"$DATABASE_URL`" -c `"select 1;`""
)
& docker @verifyArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Verify kết nối thất bại."
    exit $LASTEXITCODE
}

Write-Host "Hoàn tất restore và verify."
