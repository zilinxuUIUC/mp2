import axios from 'axios'

export interface Pokemon {
  id: number
  name: string
  height: number
  weight: number
  types: string[]
  abilities: string[]
  stats: { name: string; value: number }[]
  image: string
}

interface ApiPokemon {
  id: number; name: string; height: number; weight: number
  types: { type: { name: string } }[]
  abilities: { ability: { name: string } }[]
  stats: { stat: { name: string }; base_stat: number }[]
  sprites: { front_default: string; other: { 'official-artwork': { front_default: string | null } } }
}

const api = axios.create({ baseURL: 'https://pokeapi.co/api/v2', timeout: 15000 })
const CACHE_KEY = 'kanto-pokemon-v1'
let request: Promise<Pokemon[]> | undefined

function readCache(): Pokemon[] | undefined {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (cached && Date.now() - cached.timestamp < 7 * 86400000 &&
      Array.isArray(cached.data) && cached.data.length === 151 &&
      cached.data.every((p: Pokemon) => Number.isInteger(p.id) && typeof p.name === 'string' &&
        Array.isArray(p.types) && Array.isArray(p.stats) && Array.isArray(p.abilities))) return cached.data
  } catch { /* Storage is optional, including in private browsing. */ }
}

export function loadPokemon(): Promise<Pokemon[]> {
  const cached = readCache()
  if (cached) return Promise.resolve(cached)
  if (request) return request
  request = (async () => {
    const { data } = await api.get<{ results: { name: string }[] }>('/pokemon?limit=151')
    const result: Pokemon[] = []
    // Small batches limit simultaneous requests to the free API.
    for (let start = 0; start < data.results.length; start += 8) {
      const batch = await Promise.all(data.results.slice(start, start + 8).map(async ({ name }) => {
        const { data: p } = await api.get<ApiPokemon>(`/pokemon/${name}`)
        return {
          id: p.id, name: p.name, height: p.height, weight: p.weight,
          types: p.types.map(({ type }) => type.name),
          abilities: p.abilities.map(({ ability }) => ability.name),
          stats: p.stats.map(({ stat, base_stat }) => ({ name: stat.name, value: base_stat })),
          image: p.sprites.other['official-artwork'].front_default ?? p.sprites.front_default,
        }
      }))
      result.push(...batch)
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: result })) } catch { /* Optional cache. */ }
    return result
  })().catch((error: unknown) => { request = undefined; throw error })
  return request
}

export type SortKey = 'id' | 'name' | 'height' | 'weight'
export const formatName = (name: string) => name.replaceAll('-', ' ')
export const number = (id: number) => `#${String(id).padStart(3, '0')}`

export function filterPokemon(pokemon: Pokemon[], query: string, types: string[], sort: SortKey, descending: boolean) {
  const search = query.trim().toLowerCase().replace(/^#/, '')
  return pokemon.filter((p) =>
    (formatName(p.name).includes(search) || p.name.includes(search) || String(p.id).includes(search) || number(p.id).slice(1).includes(search)) &&
    (types.length === 0 || p.types.some((type) => types.includes(type))),
  ).sort((a, b) => {
    const difference = sort === 'name' ? a.name.localeCompare(b.name) : a[sort] - b[sort]
    return (descending ? -1 : 1) * difference || a.id - b.id
  })
}

export function neighborIds(ids: number[], id: number): [number, number] {
  const index = ids.indexOf(id)
  return [ids[(index - 1 + ids.length) % ids.length], ids[(index + 1) % ids.length]]
}
