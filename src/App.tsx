import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { filterPokemon, formatName, loadPokemon, neighborIds, number, type Pokemon, type SortKey } from './pokemon'

function TypeBadges({ types }: { types: string[] }) {
  return <span className="badges">{types.map((type) => <span className={`type type-${type}`} key={type}>{type}</span>)}</span>
}

function Artwork({ pokemon, large = false }: { pokemon: Pokemon; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [pokemon.image])
  return failed ? <span className="image-fallback" role="img" aria-label={`${formatName(pokemon.name)} artwork unavailable`}>?</span> :
    <img className={large ? 'artwork artwork-large' : 'artwork'} src={pokemon.image} alt={formatName(pokemon.name)} loading={large ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
}

function Browse({ pokemon, gallery = false }: { pokemon: Pokemon[]; gallery?: boolean }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const types = params.getAll('type')
  const rawSort = params.get('sort') ?? 'id'
  const sort: SortKey = ['id', 'name', 'height', 'weight'].includes(rawSort) ? rawSort as SortKey : 'id'
  const descending = params.get('order') === 'desc'
  const allTypes = useMemo(() => [...new Set(pokemon.flatMap((p) => p.types))].sort(), [pokemon])
  const results = filterPokemon(pokemon, query, types, sort, descending)
  const location = useLocation()
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }
  function toggleType(type: string) {
    const next = new URLSearchParams(params)
    next.delete('type')
    const selected = types.includes(type) ? types.filter((t) => t !== type) : [...types, type]
    selected.forEach((t) => next.append('type', t))
    setParams(next, { replace: true })
  }
  const context = { ids: results.map((p) => p.id), back: location.pathname + location.search }
  return <>
    <section className="intro">
      <div><span className="eyebrow">THE ORIGINAL 151 · KANTO REGION</span>
        <h1>{gallery ? 'A world of Pokémon.' : 'Meet your next discovery.'}</h1>
        <p>{gallery ? 'Explore the collection, one type at a time.' : 'From Bulbasaur to Mew. Your pocket guide to the classics.'}</p>
      </div>
      <div className="collection-stamp"><span className="pokeball" aria-hidden="true" /><span>FIELD NOTES<br /><strong>VOL. 001</strong></span></div>
    </section>
    <section className="browse-controls" aria-label="Search and sort Pokémon">
      <label className="search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search Pokémon by name or number" placeholder="Search by name or number…" value={query} onChange={(event) => update('q', event.target.value)} /><kbd>/ 151</kbd></label>
      <label className="select-label">Sort by<select aria-label="Sort by" value={sort} onChange={(event) => update('sort', event.target.value)}><option value="id">Pokédex number</option><option value="name">Name</option><option value="height">Height</option><option value="weight">Weight</option></select></label>
      <label className="select-label">Order<select aria-label="Order" value={descending ? 'desc' : 'asc'} onChange={(event) => update('order', event.target.value)}><option value="asc">Ascending ↑</option><option value="desc">Descending ↓</option></select></label>
    </section>
    {gallery && <section className="filter-panel" aria-label="Filter by Pokémon type"><div className="filter-heading"><span className="eyebrow">FILTER BY TYPE</span><span>Match any selected type</span></div><div className="type-filters"><button className={types.length === 0 ? 'filter active' : 'filter'} onClick={() => { const next = new URLSearchParams(params); next.delete('type'); setParams(next, { replace: true }) }} aria-pressed={types.length === 0}>All types</button>{allTypes.map((type) => <button key={type} className={`filter ${types.includes(type) ? 'active' : ''}`} aria-pressed={types.includes(type)} onClick={() => toggleType(type)}><span className={`type-dot type-${type}`} />{type}</button>)}</div></section>}
    <div className="results-heading"><h2>{gallery ? 'The collection' : 'Pokémon index'} <span>{results.length}</span></h2><span>{results.length} of 151 Pokémon</span></div>
    {results.length === 0 ? <div className="empty"><span className="pokeball" aria-hidden="true" /><h2>No Pokémon found</h2><p>Try another name, number, or type.</p><button className="button" onClick={() => setParams({})}>Reset filters</button></div> : gallery ?
      <div className="gallery">{results.map((p) => <Link to={`/pokemon/${p.id}`} state={context} className={`pokemon-card tint-${p.types[0]}`} key={p.id}><div className="card-top"><span>{number(p.id)}</span><span aria-hidden="true">↗</span></div><div className="card-art"><Artwork pokemon={p} /></div><h3>{formatName(p.name)}</h3><TypeBadges types={p.types} /></Link>)}</div> :
      <div className="pokemon-list"><div className="list-labels" aria-hidden="true"><span>POKÉMON</span><span>TYPE</span><span>HEIGHT</span><span>WEIGHT</span><span /></div>{results.map((p) => <Link className="pokemon-row" to={`/pokemon/${p.id}`} state={context} key={p.id}><div className="row-name"><span className="dex-number">{number(p.id)}</span><Artwork pokemon={p} /><h3>{formatName(p.name)}</h3></div><TypeBadges types={p.types} /><span className="measurement">{p.height / 10} <small>m</small></span><span className="measurement">{p.weight / 10} <small>kg</small></span><span className="row-arrow" aria-hidden="true">↗</span></Link>)}</div>}
  </>
}

function Detail({ pokemon }: { pokemon: Pokemon[] }) {
  const { id } = useParams()
  const location = useLocation()
  const p = pokemon.find((item) => String(item.id) === id)
  useEffect(() => { window.scrollTo(0, 0) }, [id])
  if (!p) return <NotFound />
  const context = location.state as { ids?: number[]; back?: string } | null
  const requestedIds = context?.ids
  const ids = requestedIds?.includes(p.id) && requestedIds.every((item) => pokemon.some((candidate) => candidate.id === item)) ? requestedIds : pokemon.map((item) => item.id)
  const [previous, next] = neighborIds(ids, p.id)
  const total = p.stats.reduce((sum, stat) => sum + stat.value, 0)
  return <div className="detail"><Link className="back-link" to={context?.back ?? '/'}>← Back to collection</Link>
    <div className="detail-layout"><div className={`detail-art tint-${p.types[0]}`}><span className="eyebrow">KANTO FIELD GUIDE</span><span className="detail-watermark" aria-hidden="true">{String(p.id).padStart(3, '0')}</span><Artwork pokemon={p} large /><span className="art-caption">OFFICIAL POKÉMON ARTWORK</span></div>
      <section className="detail-info"><span className="eyebrow">POKÉDEX {number(p.id)}</span><h1>{formatName(p.name)}</h1><TypeBadges types={p.types} /><p className="detail-description">Meet {formatName(p.name)}, a {p.types.join(' / ')}-type Pokémon from the original Kanto collection.</p><dl className="facts"><div><dt>Height</dt><dd>{p.height / 10} <small>m</small></dd></div><div><dt>Weight</dt><dd>{p.weight / 10} <small>kg</small></dd></div><div className="ability-fact"><dt>Abilities</dt><dd>{p.abilities.map(formatName).join(' · ')}</dd></div></dl>
        <div className="stats-title"><h2>Base stats</h2><span>Total <strong>{total}</strong></span></div><div className="stats">{p.stats.map((stat) => <div className="stat" key={stat.name}><label htmlFor={`stat-${stat.name}`}>{formatName(stat.name)}</label><span>{stat.value}</span><meter id={`stat-${stat.name}`} min={0} max={255} value={stat.value}>{stat.value} / 255</meter></div>)}</div>
      </section></div>
    <nav className="detail-navigation" aria-label="Browse Pokémon"><Link to={`/pokemon/${previous}`} state={context}><span>← Previous</span><strong>{number(previous)} {formatName(pokemon.find((item) => item.id === previous)!.name)}</strong></Link><span className="position">{ids.indexOf(p.id) + 1} / {ids.length}</span><Link to={`/pokemon/${next}`} state={context}><span>Next →</span><strong>{number(next)} {formatName(pokemon.find((item) => item.id === next)!.name)}</strong></Link></nav>
  </div>
}

function NotFound() {
  return <section className="empty"><h1>Off the map.</h1><p>This page isn’t in the Kanto field guide.</p><Link className="button" to="/">Return to the index</Link></section>
}

export default function App() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    loadPokemon().then((data) => { if (active) setPokemon(data) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [attempt])
  return <><header className="site-header"><div className="header-inner"><Link to="/" className="brand"><span className="brand-icon pokeball" aria-hidden="true" /><span>KANTO<span className="brand-subtitle">FIELD GUIDE</span></span></Link><nav aria-label="Main navigation"><NavLink to="/" end>Index</NavLink><NavLink to="/gallery">Gallery</NavLink></nav><span className="header-note"><span className="status-dot" /> A little curiosity goes a long way.</span></div></header>
    <main>{error ? <section className="empty" role="alert"><h1>A brief detour.</h1><p>We couldn’t reach PokéAPI. Check your connection and try again.</p><button className="button" onClick={() => { setError(false); setAttempt((value) => value + 1) }}>Try again</button></section> : pokemon.length === 0 ? <section className="empty loading" role="status"><span className="pokeball" aria-hidden="true" /><h1>Opening the field guide…</h1><p>Fetching the original 151 Pokémon. Your next visit will use a saved collection.</p></section> : <Routes><Route path="/" element={<Browse pokemon={pokemon} />} /><Route path="/gallery" element={<Browse pokemon={pokemon} gallery />} /><Route path="/pokemon/:id" element={<Detail pokemon={pokemon} />} /><Route path="*" element={<NotFound />} /></Routes>}</main>
    <footer><span>KANTO <span className="footer-separator">/</span> Made for the curious.</span><span>Data & artwork from <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">PokéAPI ↗</a> · CS 409 / MP 2</span></footer>
  </>
}
