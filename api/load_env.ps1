# Run from api/: .\load_env.ps1
$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '../.env'

if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw "Missing environment file: $envFile"
}

# Read simple KEY=value entries as data; never execute the environment file.
$lineNumber = 0
foreach ($line in Get-Content -LiteralPath $envFile) {
    $lineNumber++
    $entry = $line.Trim()
    if (-not $entry -or $entry.StartsWith('#')) { continue }
    if ($entry -notmatch '^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        throw "Invalid environment entry on line $lineNumber. Use KEY=value."
    }
    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if ($value.StartsWith('"') -or $value.StartsWith("'")) {
        $quote = $value.Substring(0, 1)
        $end = $value.IndexOf($quote, 1)
        if ($end -lt 1 -or $value.Substring($end + 1).Trim() -notmatch '^(#.*)?$') {
            throw "Invalid quoted environment value on line $lineNumber."
        }
        $value = $value.Substring(1, $end - 1)
    } else {
        $value = ($value -replace '\s+#.*$', '').TrimEnd()
    }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

& (Join-Path $PSScriptRoot 'gradlew.bat') -p $PSScriptRoot bootRun
exit $LASTEXITCODE
