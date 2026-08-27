param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\audio\phonemes')
)

$ErrorActionPreference = 'Stop'

$resolvedRepo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
$repoPrefix = $resolvedRepo.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $resolvedOutput.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Unsafe output directory: $resolvedOutput"
}

New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

$longMark = [char]0x02D0
$smallI = [char]0x026A
$ash = [char]0x00E6
$openMidFront = [char]0x025B
$wedge = [char]0x028C
$openBack = [char]0x0251
$openMidRounded = [char]0x0254
$upsilon = [char]0x028A
$openMidCentral = [char]0x025C
$schwa = [char]0x0259
$theta = [char]0x03B8
$eth = [char]0x00F0
$esh = [char]0x0283
$ezh = [char]0x0292
$eng = [char]0x014B
$turnedR = [char]0x0279

$phonemes = [ordered]@{
  'i-long'       = ('i' + $longMark)
  'i-short'      = [string]$smallI
  'e'            = [string]$openMidFront
  'ae'           = [string]$ash
  'strut'        = [string]$wedge
  'a-long'       = ([string]$openBack + $longMark)
  'o-short'      = [string]$openMidRounded
  'aw-long'      = ([string]$openMidRounded + $longMark)
  'u-short'      = [string]$upsilon
  'u-long'       = ('u' + $longMark)
  'er-long'      = ([string]$openMidCentral + $longMark)
  'schwa'        = [string]$schwa
  'ay'           = ('e' + $smallI)
  'eye'          = ('a' + $smallI)
  'oy'           = ([string]$openMidRounded + $smallI)
  'oh'           = ([string]$schwa + $upsilon)
  'ow'           = ('a' + $upsilon)
  'ear'          = ([string]$smallI + $schwa)
  'air'          = ('e' + $schwa)
  'ure'          = ([string]$upsilon + $schwa)
  'p'            = 'p'
  'b'            = 'b'
  't'            = 't'
  'd'            = 'd'
  'k'            = 'k'
  'g'            = 'g'
  'f'            = 'f'
  'v'            = 'v'
  'th-voiceless' = [string]$theta
  'th-voiced'    = [string]$eth
  's'            = 's'
  'z'            = 'z'
  'sh'           = [string]$esh
  'zh'           = [string]$ezh
  'h'            = 'h'
  'ch'           = ('t' + $esh)
  'j'            = ('d' + $ezh)
  'm'            = 'm'
  'n'            = 'n'
  'ng'           = [string]$eng
  'l'            = 'l'
  'r'            = [string]$turnedR
  'y'            = 'j'
  'w'            = 'w'
}

$synthVoice = New-Object -ComObject SAPI.SpVoice
$englishVoice = $null
for ($voiceIndex = 0; $voiceIndex -lt $synthVoice.GetVoices().Count; $voiceIndex++) {
  $candidateVoice = $synthVoice.GetVoices().Item($voiceIndex)
  if ($candidateVoice.GetDescription() -match 'English') {
    $englishVoice = $candidateVoice
    if ($candidateVoice.GetDescription() -match 'Zira') { break }
  }
}
if (-not $englishVoice) { throw 'No English Windows speech voice is installed.' }
$synthVoice.Voice = $englishVoice
$synthVoice.Rate = -2

foreach ($entry in $phonemes.GetEnumerator()) {
  # The US voice merges /ɔ/ and /ɔː/ unless duration is made explicit.
  $synthVoice.Rate = if ($entry.Key -eq 'o-short') { 1 } else { -2 }
  $targetFile = Join-Path $resolvedOutput ($entry.Key + '.wav')
  $escapedPhone = [Security.SecurityElement]::Escape([string]$entry.Value)
  $speechXml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><phoneme alphabet='ipa' ph='$escapedPhone'>sound</phoneme></speak>"
  $fileStream = New-Object -ComObject SAPI.SpFileStream
  try {
    $fileStream.Open($targetFile, 3, $false)
    $synthVoice.AudioOutputStream = $fileStream
    [void]$synthVoice.Speak($speechXml, 8)
  } finally {
    $fileStream.Close()
  }
  $fileLength = (Get-Item -LiteralPath $targetFile).Length
  if ($fileLength -lt 1000) { throw "Generated audio is unexpectedly small: $targetFile" }
  Write-Output ("generated {0} /{1}/ ({2} bytes)" -f $entry.Key, $entry.Value, $fileLength)
}

Write-Output ("completed voice='{0}' files={1}" -f $englishVoice.GetDescription(), $phonemes.Count)
