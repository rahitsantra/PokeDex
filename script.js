
const statNames = {
    hp: 'HP', attack: 'ATK', defense: 'DEF',
    'special-attack': 'Sp.ATK', 'special-defense': 'Sp.DEF', speed: 'SPD'
};

document.getElementById('searchBtn').addEventListener('click', fetchData);
document.getElementById('pokemonName').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchData();
});

async function fetchData() {
    const raw = document.getElementById('pokemonName').value.trim().toLowerCase();
    if (!raw) return;

    const card = document.getElementById('pokemonCard');
    const errMsg = document.getElementById('errorMsg');
    const spinner = document.getElementById('spinner');

    // Reset UI
    card.style.display = 'none';
    errMsg.style.display = 'none';
    spinner.style.display = 'block';

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${raw}`);

        if (!response.ok) throw new Error(`No Pokémon found for "${raw}"`);

        const data = await response.json();

        // Sprite
        const sprite = data.sprites.front_default;
        document.getElementById('PokemonSprite').src = sprite || '';

        // Name & ID
        document.getElementById('pokemonNameDisplay').textContent =
            data.name.charAt(0).toUpperCase() + data.name.slice(1);
        document.getElementById('pokemonId').textContent =
            '#' + String(data.id).padStart(3, '0');

        // Types
        const typesEl = document.getElementById('pokemonTypes');
        typesEl.innerHTML = data.types.map(t =>
            `<span class="type-badge t-${t.type.name}">${t.type.name}</span>`
        ).join('');

        // Info pills
        document.getElementById('pokemonHeight').textContent =
            (data.height / 10).toFixed(1) + ' m';
        document.getElementById('pokemonWeight').textContent =
            (data.weight / 10).toFixed(1) + ' kg';
        document.getElementById('pokemonXP').textContent =
            data.base_experience ?? '—';

        // Stats
        const statsEl = document.getElementById('statsContainer');
        statsEl.innerHTML = data.stats.map(s => {
            const label = statNames[s.stat.name] || s.stat.name;
            const val = s.base_stat;
            const pct = Math.min((val / 255) * 100, 100);
            return `
            <div class="stat-row">
              <span class="stat-label">${label}</span>
              <div class="stat-bar-bg">
                <div class="stat-bar-fill" data-pct="${pct}"></div>
              </div>
              <span class="stat-val">${val}</span>
            </div>`;
        }).join('');

        spinner.style.display = 'none';
        card.style.display = 'flex';

        // Animate stat bars after render
        requestAnimationFrame(() => {
            document.querySelectorAll('.stat-bar-fill').forEach(bar => {
                bar.style.width = bar.dataset.pct + '%';
            });
        });

    } catch (error) {
        spinner.style.display = 'none';
        errMsg.textContent = '⚠️ ' + error.message;
        errMsg.style.display = 'block';
    }
}
