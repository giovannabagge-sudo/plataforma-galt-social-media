import { spawn } from 'child_process'
import Anthropic from '@anthropic-ai/sdk'

function executarViaCLI(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', '--output-format', 'text'], {
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        resolve(stdout.trim())
      } else {
        reject(new Error(stderr || `claude exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`))
    })

    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

async function executarViaAPI(prompt: string): Promise<string> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = message.content[0]
  if (block.type === 'text') return block.text
  throw new Error('Resposta inesperada da API')
}

export function executarClaude(prompt: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return executarViaAPI(prompt)
  }
  return executarViaCLI(prompt)
}
