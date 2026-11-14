"""Gera um MP3 para cada chunk de ENGLISH_CHUNKS (index.html) em audio/chunks/.

Por que existe: a voz do aparelho (speechSynthesis) nao existe em todo celular; o MP3 toca em qualquer um.
O app procura audio/chunks/<slug>.mp3 e so cai na voz do aparelho se o arquivo nao existir.

Usa as vozes do Windows (SAPI, offline) e o encoder lameenc (pip install --user lameenc).
Para trocar a voz depois: python tools/gera_audio_chunks.py --force --voice "Nome da voz"

    python tools/gera_audio_chunks.py            # so os que ainda nao tem arquivo
    python tools/gera_audio_chunks.py --force    # refaz todos
    python tools/gera_audio_chunks.py --only "by the way"
"""
import argparse, array, json, os, re, subprocess, sys, tempfile, wave

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(AQUI)
OUT = os.path.join(REPO, "audio", "chunks")
RATE_HZ = 22050


def slug(text):
    # Precisa ser identico ao chunkAudioSlug() do index.html
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def le_chunks():
    src = open(os.path.join(REPO, "index.html"), encoding="utf-8").read()
    i = src.index("const ENGLISH_CHUNKS = [")
    j = src.index("\n];", i)
    return re.findall(r"^\s*\['([^']+)'", src[i:j], re.M)


PS1 = r"""
param([string]$Manifest, [string]$Voice, [int]$Rate)
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = $Rate
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($it in $items) {
  $s.SetOutputToWaveFile($it.wav, $fmt)
  $s.Speak($it.text)
  $s.SetOutputToNull()
}
$s.Dispose()
"""


def wav_para_mp3(wav_path, mp3_path):
    import lameenc
    with wave.open(wav_path, "rb") as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2 and w.getframerate() == RATE_HZ
        pcm = array.array("h")
        pcm.frombytes(w.readframes(w.getnframes()))
    # tira o silencio das pontas (deixa 60 ms antes e 150 ms depois para nao cortar seco)
    limiar = 350
    ini = next((k for k, v in enumerate(pcm) if abs(v) > limiar), 0)
    fim = next((k for k in range(len(pcm) - 1, -1, -1) if abs(pcm[k]) > limiar), len(pcm) - 1)
    ini = max(0, ini - int(RATE_HZ * 0.06))
    fim = min(len(pcm), fim + int(RATE_HZ * 0.15))
    pcm = pcm[ini:fim]
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(RATE_HZ)
    enc.set_channels(1)
    enc.set_quality(2)
    data = enc.encode(pcm.tobytes()) + enc.flush()
    with open(mp3_path, "wb") as f:
        f.write(data)
    return len(pcm) / RATE_HZ, len(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="Microsoft Zira Desktop")
    ap.add_argument("--rate", type=int, default=-2, help="-10 (lento) a 10 (rapido); -2 foi o mais rapido em que o reconhecedor de voz entendeu os 50 chunks")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", help="gera so este chunk (texto exato)")
    a = ap.parse_args()

    chunks = le_chunks()
    if a.only:
        chunks = [c for c in chunks if c == a.only]
        if not chunks:
            sys.exit("chunk nao encontrado: " + a.only)
    os.makedirs(OUT, exist_ok=True)
    fazer = [c for c in chunks if a.force or not os.path.exists(os.path.join(OUT, slug(c) + ".mp3"))]
    print(f"{len(chunks)} chunks, {len(fazer)} para gerar")
    if not fazer:
        return

    with tempfile.TemporaryDirectory() as tmp:
        itens = [{"text": c, "wav": os.path.join(tmp, slug(c) + ".wav")} for c in fazer]
        man = os.path.join(tmp, "m.json")
        json.dump(itens, open(man, "w", encoding="utf-8"), ensure_ascii=False)
        ps1 = os.path.join(tmp, "gera.ps1")
        open(ps1, "w", encoding="utf-8-sig").write(PS1)
        r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1,
                            "-Manifest", man, "-Voice", a.voice, "-Rate", str(a.rate)],
                           capture_output=True, text=True)
        if r.returncode:
            sys.exit("PowerShell falhou:\n" + r.stdout + r.stderr)
        total = 0
        for it in itens:
            mp3 = os.path.join(OUT, os.path.basename(it["wav"])[:-4] + ".mp3")
            seg, tam = wav_para_mp3(it["wav"], mp3)
            total += tam
            print(f"  {it['text']:<24} {seg:4.1f}s  {tam/1024:5.1f} KB")
        print(f"pronto: {len(itens)} arquivos, {total/1024:.0f} KB no total -> {OUT}")


if __name__ == "__main__":
    main()
