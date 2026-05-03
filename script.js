let offset = 0;
const limit = 20;
let isSearchMode = false;

const TYPE_COLORS = {
  fire: '#fd7d24', water: '#4592c4', grass: '#9bcc50', electric: '#eed535',
  psychic: '#f366b9', ice: '#51c4e7', dragon: '#53a4cf', dark: '#707070',
  fairy: '#fdb9e9', normal: '#a4acaf', fighting: '#d56723', poison: '#b97fc9',
  ground: '#f7de3f', flying: '#3dc7ef', bug: '#729f3f', rock: '#a38c21',
  ghost: '#7b62a3', steel: '#9eb7b8'
};

const DARK_TYPES = new Set(['fire','fighting','poison','bug','rock','ghost','dragon','dark','steel','water','grass','psychic','ice']);

const STAT_LABELS = {
  hp: 'HP', attack: 'ATK', defense: 'DEF',
  'special-attack': 'Sp.ATK', 'special-defense': 'Sp.DEF', speed: 'SPD'
};

async function loadPokemon() {
  showGridLoading();
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`);
    const data = await res.json();

    const container = document.getElementById('pokemonList');
    container.innerHTML = '';

    // Fetch all cards in parallel
    const pokePromises = data.results.map(p => fetch(p.url).then(r => r.json()));
    const pokemons = await Promise.all(pokePromises);
    pokemons.forEach(p => createCard(p));

    updatePageInfo();
    document.getElementById('prevBtn').disabled = offset === 0;
  } catch {
    showError('Failed to load Pokémon. Check your connection.');
  }
}

function createCard(data) {
  const card = document.createElement('div');
  card.classList.add('card');

  const primaryType = data.types[0].type.name;
  const typeColor = TYPE_COLORS[primaryType] || '#a4acaf';
  const typeBadges = data.types.map(t =>
    `<span class="type-badge" style="background:${TYPE_COLORS[t.type.name] || '#aaa'};color:${DARK_TYPES.has(t.type.name) ? '#fff' : '#1a1a1a'}">${t.type.name}</span>`
  ).join('');

  card.style.setProperty('--type-color', typeColor);

  card.innerHTML = `
    <div class="card-id">#${String(data.id).padStart(3,'0')}</div>
    <div class="card-sprite-wrap">
      <img src="${data.sprites.front_default || ''}" alt="${data.name}" loading="lazy">
    </div>
    <h4>${capitalize(data.name)}</h4>
    <div class="card-types">${typeBadges}</div>
  `;

  card.onclick = () => showDetails(data);
  document.getElementById('pokemonList').appendChild(card);
  requestAnimationFrame(() => card.classList.add('visible'));
}

function nextPage() {
  offset += limit;
  loadPokemon();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevPage() {
  if (offset >= limit) {
    offset -= limit;
    loadPokemon();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updatePageInfo() {
  const page = Math.floor(offset / limit) + 1;
  document.getElementById('pageInfo').textContent = `Page ${page}`;
}

async function searchPokemon() {
  const name = document.getElementById('search').value.trim().toLowerCase();
  if (!name) return;

  hideError();
  showGridLoading();
  isSearchMode = true;
  document.getElementById('pagination').classList.add('hidden');
  document.getElementById('resetBtn').classList.remove('hidden');

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
    if (!res.ok) throw new Error(`No Pokémon found for "${name}"`);
    const data = await res.json();

    document.getElementById('pokemonList').innerHTML = '';
    createCard(data);
    showDetails(data);
  } catch (e) {
    document.getElementById('pokemonList').innerHTML = '';
    showError(`⚠️ ${e.message}`);
  }
}

function resetSearch() {
  isSearchMode = false;
  document.getElementById('search').value = '';
  document.getElementById('resetBtn').classList.add('hidden');
  document.getElementById('pagination').classList.remove('hidden');
  hideError();
  offset = 0;
  loadPokemon();
}

async function showDetails(pokemon) {
  const modal   = document.getElementById('modal');
  const details = document.getElementById('details');
  details.innerHTML = '<div class="modal-loading">Loading...</div>';
  modal.classList.remove('hidden');

  try {
    const speciesRes  = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    const evoRes  = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    const evolutions = [];
    let chain = evoData.chain;
    while (chain) {
      evolutions.push(capitalize(chain.species.name));
      chain = chain.evolves_to[0];
    }

    const flavor = speciesData.flavor_text_entries
      .find(e => e.language.name === 'en')?.flavor_text
      .replace(/\f/g, ' ') || '';

    const primaryType = pokemon.types[0].type.name;
    const typeColor   = TYPE_COLORS[primaryType] || '#a4acaf';

    const typeBadges = pokemon.types.map(t =>
      `<span class="type-badge" style="background:${TYPE_COLORS[t.type.name] || '#aaa'};color:${DARK_TYPES.has(t.type.name)?'#fff':'#1a1a1a'}">${t.type.name}</span>`
    ).join('');

    const statBars = pokemon.stats.map(s => {
      const label = STAT_LABELS[s.stat.name] || s.stat.name;
      const pct   = Math.min((s.base_stat / 255) * 100, 100).toFixed(1);
      return `
        <div class="stat-row">
          <span class="stat-label">${label}</span>
          <div class="stat-bar-bg">
            <div class="stat-bar-fill" data-pct="${pct}" style="--bar-color:${typeColor}"></div>
          </div>
          <span class="stat-val">${s.base_stat}</span>
        </div>`;
    }).join('');

    const shinySprite = pokemon.sprites.front_shiny || pokemon.sprites.front_default;
    const normalSprite = pokemon.sprites.front_default;

    details.innerHTML = `
      <div class="detail-header" style="--accent:${typeColor}">
        <div class="detail-id">#${String(pokemon.id).padStart(3,'0')}</div>
        <h2 class="detail-name">${capitalize(pokemon.name)}</h2>
        <div class="detail-types">${typeBadges}</div>
      </div>

      <div class="sprite-toggle-area">
        <img id="mainSprite" src="${normalSprite}" alt="${pokemon.name}" class="detail-sprite">
        <button class="shiny-btn" onclick="toggleShiny('${normalSprite}','${shinySprite}')">✨ Shiny</button>
      </div>

      <p class="flavor-text">${flavor}</p>

      <div class="info-pills">
        <div class="info-pill"><div class="pill-label">Height</div><div class="pill-val">${(pokemon.height/10).toFixed(1)} m</div></div>
        <div class="info-pill"><div class="pill-label">Weight</div><div class="pill-val">${(pokemon.weight/10).toFixed(1)} kg</div></div>
        <div class="info-pill"><div class="pill-label">Base XP</div><div class="pill-val">${pokemon.base_experience ?? '—'}</div></div>
      </div>

      <div class="section-title">Abilities</div>
      <div class="abilities">
        ${pokemon.abilities.map(a =>
          `<span class="ability-badge${a.is_hidden?' hidden-ability':''}">${capitalize(a.ability.name)}${a.is_hidden?' <em>(hidden)</em>':''}</span>`
        ).join('')}
      </div>

      <div class="section-title">Base Stats</div>
      <div class="stats">${statBars}</div>

      <div class="section-title">Evolution Chain</div>
      <div class="evo-chain">${evolutions.map((e,i) =>
        `${i>0?'<span class="evo-arrow">→</span>':''}<span class="evo-name">${e}</span>`
      ).join('')}</div>
    `;

    // Animate stat bars
    requestAnimationFrame(() => {
      details.querySelectorAll('.stat-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    });

  } catch (e) {
    details.innerHTML = `<p class="modal-error">Failed to load details.</p>`;
  }
}

function toggleShiny(normal, shiny) {
  const img = document.getElementById('mainSprite');
  img.src = img.src.includes(shiny.split('/').pop()) ? normal : shiny;
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showGridLoading() {
  const container = document.getElementById('pokemonList');
  container.innerHTML = Array(limit).fill(0).map(() =>
    `<div class="card skeleton"></div>`
  ).join('');
}

function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('errorBanner').classList.add('hidden');
}

// Enter key on search
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchPokemon();
  });
  loadPokemon();
});
