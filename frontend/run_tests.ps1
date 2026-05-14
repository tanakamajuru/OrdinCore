# Load .env.test
if (Test-Path ".env.test") {
    Get-Content .env.test | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}

# Run playwright
npx playwright test tests/05-closed-loop.spec.ts tests/06-promote-incident.spec.ts --project=chromium --reporter=list --workers=1
