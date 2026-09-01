param(
  [string]$AudioDirectory = (Join-Path $PSScriptRoot '..\audio\phonemes'),
  [int]$TargetPeak = 26000,
  [double]$MaximumGain = 30
)

$ErrorActionPreference = 'Stop'

$resolvedRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$resolvedAudio = [IO.Path]::GetFullPath($AudioDirectory)
$repoPrefix = $resolvedRepo.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $resolvedAudio.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Unsafe audio directory: $resolvedAudio"
}
if ($TargetPeak -lt 1000 -or $TargetPeak -gt 32000) { throw 'TargetPeak must be between 1000 and 32000.' }
if ($MaximumGain -lt 1 -or $MaximumGain -gt 50) { throw 'MaximumGain must be between 1 and 50.' }

function Get-WaveChunk {
  param([byte[]]$Bytes, [string]$ChunkName)
  $cursor = 12
  while ($cursor + 8 -le $Bytes.Length) {
    $name = [Text.Encoding]::ASCII.GetString($Bytes, $cursor, 4)
    $size = [BitConverter]::ToInt32($Bytes, $cursor + 4)
    if ($size -lt 0 -or $cursor + 8 + $size -gt $Bytes.Length) { break }
    if ($name -eq $ChunkName) { return @{ Offset = $cursor + 8; Size = $size } }
    $cursor += 8 + $size + ($size % 2)
  }
  return $null
}

$files = @(Get-ChildItem -LiteralPath $resolvedAudio -Filter '*.wav' -File | Sort-Object Name)
if ($files.Count -ne 44) { throw "Expected 44 WAV files, found $($files.Count)." }

foreach ($file in $files) {
  $bytes = [IO.File]::ReadAllBytes($file.FullName)
  if ($bytes.Length -lt 44 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'RIFF' -or [Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne 'WAVE') {
    throw "Invalid WAV file: $($file.FullName)"
  }
  $format = Get-WaveChunk -Bytes $bytes -ChunkName 'fmt '
  $data = Get-WaveChunk -Bytes $bytes -ChunkName 'data'
  if (-not $format -or -not $data) { throw "Missing WAV chunks: $($file.FullName)" }
  $audioFormat = [BitConverter]::ToInt16($bytes, $format.Offset)
  $bitsPerSample = [BitConverter]::ToInt16($bytes, $format.Offset + 14)
  if ($audioFormat -ne 1 -or $bitsPerSample -ne 16) { throw "Only PCM 16-bit WAV is supported: $($file.FullName)" }

  $peak = 0
  for ($offset = $data.Offset; $offset + 1 -lt $data.Offset + $data.Size; $offset += 2) {
    $sample = [Math]::Abs([int][BitConverter]::ToInt16($bytes, $offset))
    if ($sample -gt $peak) { $peak = $sample }
  }
  if ($peak -eq 0) { throw "Silent WAV file: $($file.FullName)" }

  $gain = [Math]::Min($MaximumGain, $TargetPeak / $peak)
  for ($offset = $data.Offset; $offset + 1 -lt $data.Offset + $data.Size; $offset += 2) {
    $sample = [BitConverter]::ToInt16($bytes, $offset)
    $scaled = [Math]::Round($sample * $gain)
    $scaled = [Math]::Max(-32768, [Math]::Min(32767, $scaled))
    $pair = [BitConverter]::GetBytes([int16]$scaled)
    $bytes[$offset] = $pair[0]
    $bytes[$offset + 1] = $pair[1]
  }
  [IO.File]::WriteAllBytes($file.FullName, $bytes)
  Write-Output ("normalized {0} peak={1} gain={2:N2}x" -f $file.Name, $peak, $gain)
}

Write-Output ("completed files={0} targetPeak={1}" -f $files.Count, $TargetPeak)
