// Gera os PNGs do PWA (fundo escuro + poste de barbearia estilizado) sem
// dependências: monta o buffer de pixels e codifica o PNG na mão com zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { Buffer } from 'node:buffer'

mkdirSync(new URL('../public', import.meta.url), { recursive: true })

const BG = [246, 245, 243]      // #f6f5f3 (creme claro)
const ARO = [28, 25, 23]        // #1c1917 (grafite)
const BRONZE = [176, 125, 79]   // #b07d4f
const BRANCO = [255, 255, 255]

function corPixel(x, y, size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.30
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > r) return BG
  // aro grafite do "poste"
  if (dist > r - size * 0.03) return ARO
  // listras diagonais alternadas dentro do círculo (branco / bronze)
  const faixa = Math.floor((x + y) / (size * 0.10)) % 2
  return faixa === 0 ? BRANCO : BRONZE
}

function gerarPNG(size) {
  const linhas = Buffer.alloc((size * 3 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    linhas[p++] = 0 // filtro "none" no início de cada linha
    for (let x = 0; x < size; x++) {
      const [r, g, b] = corPixel(x, y, size)
      linhas[p++] = r
      linhas[p++] = g
      linhas[p++] = b
    }
  }
  const comprimido = deflateSync(linhas)

  const chunk = (tipo, dados) => {
    const buf = Buffer.alloc(12 + dados.length)
    buf.writeUInt32BE(dados.length, 0)
    buf.write(tipo, 4, 'ascii')
    dados.copy(buf, 8)
    buf.writeUInt32BE(crc32(buf.subarray(4, 8 + dados.length)), 8 + dados.length)
    return buf
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type: truecolor RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', comprimido),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// CRC32 (tabela padrão do PNG)
const TABELA = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

for (const size of [180, 192, 512]) {
  const nome = new URL(`../public/icon-${size}.png`, import.meta.url)
  writeFileSync(nome, gerarPNG(size))
  console.log(`gerado public/icon-${size}.png`)
}
