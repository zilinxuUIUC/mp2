import { describe, expect, it } from 'vitest'
import { filterPokemon, neighborIds, type Pokemon, type SortKey } from './pokemon'

const collection: Pokemon[] = [
  { id: 1, name: 'bulbasaur', height: 7, weight: 69, types: ['grass', 'poison'], abilities: [], stats: [], image: '' },
  { id: 4, name: 'charmander', height: 6, weight: 85, types: ['fire'], abilities: [], stats: [], image: '' },
  { id: 7, name: 'squirtle', height: 5, weight: 90, types: ['water'], abilities: [], stats: [], image: '' },
]

describe('Browsing the collection', () => {
  it('searches partial names, case-insensitive names, and padded Pokédex numbers', () => {
    for (const query of ['BULB', '#001', '001']) expect(filterPokemon(collection, query, [], 'id', false).map((p) => p.id)).toEqual([1])
    expect(filterPokemon(collection, 'unknown', [], 'id', false)).toEqual([])
  })
  it('combines text search with any selected type and does not duplicate dual types', () => {
    expect(filterPokemon(collection, '', ['grass', 'poison', 'fire'], 'id', false).map((p) => p.id)).toEqual([1, 4])
    expect(filterPokemon(collection, 'squ', ['fire'], 'id', false)).toEqual([])
  })
  it.each<[SortKey, number[]]>([['id', [1, 4, 7]], ['name', [1, 4, 7]], ['height', [7, 4, 1]], ['weight', [1, 4, 7]]])('sorts %s in both directions without mutating the source', (key, expected) => {
    expect(filterPokemon(collection, '', [], key, false).map((p) => p.id)).toEqual(expected)
    expect(filterPokemon(collection, '', [], key, true).map((p) => p.id)).toEqual([...expected].reverse())
    expect(collection.map((p) => p.id)).toEqual([1, 4, 7])
  })
  it('cycles through the displayed order, wraps at both ends, and supports one result', () => {
    expect(neighborIds([7, 4, 1], 4)).toEqual([7, 1])
    expect(neighborIds([7, 4, 1], 7)).toEqual([1, 4])
    expect(neighborIds([7, 4, 1], 1)).toEqual([4, 7])
    expect(neighborIds([4], 4)).toEqual([4, 4])
  })
})
