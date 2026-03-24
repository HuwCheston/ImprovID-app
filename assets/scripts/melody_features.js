let player = document.getElementById("mplayer");

/**
 * Dispose of the current WebGL context to prevent context exhaustion
 */
function disposePlayer() {
    try {
        // Method 1: Use player's built-in dispose if available
        if (player.player?.dispose && typeof player.player.dispose === 'function') {
            player.player.dispose();
        }
    } catch (e) {
        console.warn('Player dispose failed:', e);
    }

    try {
        // Method 2: Manually lose WebGL context
        const shadow = player.shadowRoot;
        if (shadow) {
            const canvases = shadow.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
                if (gl) {
                    const loseContext = gl.getExtension('WEBGL_lose_context');
                    if (loseContext) {
                        loseContext.loseContext();
                    }
                }
            });
        }
    } catch (e) {
        console.warn('WebGL context disposal failed:', e);
    }

    try {
        // Method 3: Clear any remaining references
        if (player._showAllTracksHandler) {
            player.removeEventListener('load', player._showAllTracksHandler);
            player._showAllTracksHandler = null;
        }
    } catch (e) {
        console.warn('Event listener cleanup failed:', e);
    }
}

/**
 * Set the track in the wave-roll player
 * @param {string} assetPath - Path to the MIDI file
 */
async function setTrack(assetPath) {
    // Dispose old WebGL context before loading new track
    disposePlayer();

    const baseName = assetPath.replace(".mid", "");
    const midPath = `../../assets/midi/melody_examples/${assetPath}`;
    const midPath2 = `../../assets/midi/melody_examples/${baseName}_ex.mid`;
    const midPath3 = `../../assets/midi/melody_examples/${baseName}_oth.mid`;

    const midPaths = [
        {path: midPath, type: 'midi', name: assetPath},
        {path: midPath2, type: 'midi', name: 'ex'},
    ];

    try {
        const res = await fetch(midPath3, {method: 'HEAD'});
        if (res.ok) {
            midPaths.push({path: midPath3, type: 'midi', name: 'other'});
        }
    } catch (_) {
        // midPath3 doesn't exist, that's fine
    }

    // Set up one-time load handler for UI initialization
    player._showAllTracksHandler = () => {
        const shadow = player.shadowRoot;
        if (!shadow) return;

        // Click any "Toggle visibility" button whose eye icon is currently hidden
        // (eye-off SVG contains a <line> element for the slash; eye-on does not)
        shadow.querySelectorAll('button[title="Toggle visibility"]').forEach(btn => {
            if (btn.querySelector('line')) {
                btn.click();
            }
        });

        // Switch "Show notes" dropdown to "File colors"
        shadow.querySelectorAll('select').forEach(select => {
            const fileColorsOption = Array.from(select.options)
                .find(o => o.text.toLowerCase().includes('file color'));
            if (fileColorsOption) {
                select.value = fileColorsOption.value;
                select.dispatchEvent(new Event('change', {bubbles: true}));
            }
        });

        initPlayer();
    };

    player.addEventListener('load', player._showAllTracksHandler, {once: true});

    // Update player with new files
    await new Promise(r => requestAnimationFrame(r));
    player.setAttribute('files', JSON.stringify(midPaths));

    addDownloadLink(midPath, assetPath);
}

/**
 * Format pianist name for file paths
 * @param {string} pianist - Pianist name
 * @returns {string} Formatted name (lowercase, underscores)
 */
function formatPianistName(pianist) {
    return pianist.replace(/ /g, "_").toLowerCase();
}

/**
 * Parse JSON file via synchronous XMLHttpRequest
 * @param {string} jsName - Path to JSON file
 * @returns {object} Parsed JSON data
 */
function parseJSON(jsName) {
    let request = new XMLHttpRequest();
    request.open("GET", jsName, false);
    request.send(null);
    return JSON.parse(request.responseText);
}

/**
 * Play a specific example MIDI for a melody concept
 * @param {string|number} concept - Melody concept identifier
 * @param {string} pianist - Pianist name
 */
function playExampleMidi(concept, pianist) {
    let conceptPadded = String(concept).padStart(3, '0');
    let pianistFmt = formatPianistName(pianist);
    let src = `../../assets/midi/melody_features/${pianistFmt}_${conceptPadded}.mid`;

    player.setAttribute('files', JSON.stringify([
        {path: src, type: 'midi', name: `${pianistFmt}_${conceptPadded}.mid`}
    ]));
}

/**
 * Show the info popup
 */
function showInfoPopup() {
    document.getElementById('popupTitle').innerText = name;
    document.getElementById('popup').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('content').classList.add('blurred');
}

/**
 * Close the info popup
 */
function closeInfoPopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('content').classList.remove('blurred');
}

/**
 * Populate dropdown menu with metadata for a concept/pianist combo
 * @param {string|number} concept - Melody concept identifier
 * @param {string} pianist - Pianist name
 */
function popSelect(concept, pianist) {
    let pianistFmt = formatPianistName(pianist);
    let jsPath = `../../assets/metadata/melody_features/${pianistFmt}.json`;
    let jsonData = parseJSON(jsPath);
    let conceptData = jsonData[concept];
    let dropper = document.getElementById("dropdown-menu");
    dropper.innerHTML = "";

    document.getElementById("progressionName").innerHTML = "Pattern: " + intervalsToPitches(concept);

    for (var i in conceptData) {
        let trackData = conceptData[i];
        let opt = document.createElement('option');
        opt.value = trackData["asset_path"] + '.mid';
        opt.innerHTML = `${trackData["track_name"]} (${trackData["album_name"]}, ${trackData["recording_year"]})`;
        dropper.appendChild(opt);
    }
    dropper.value = conceptData[0]["asset_path"] + '.mid';
    dropper.onchange(dropper.value);
}

/**
 * Convert interval array to pitch notation
 * @param {string} intervals - JSON string of intervals
 * @returns {string} Formatted pitch set notation
 */
function intervalsToPitches(intervals) {
    let feature_arr = JSON.parse(intervals);
    let pitch_set = [0];
    let current_pitch = 0;

    for (let interval_idx in feature_arr) {
        let current_interval = feature_arr[interval_idx];
        current_pitch = current_pitch + current_interval;
        pitch_set.push(current_pitch);
    }

    return "(" + pitch_set.join(", ") + ")";
}

/**
 * Add download link and legend below the player
 * @param {string} midPath - Path to MIDI file
 * @param {string} assetName - Asset name for download
 */
function addDownloadLink(midPath, assetName) {
    const existing = document.getElementById("downloader-row");
    if (existing) existing.remove();

    const row = document.createElement("div");
    row.id = "downloader-row";
    row.style.cssText = `
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        margin-top: 4px;
    `;

    const label = document.createElement("p");
    label.style.cssText = `margin: 0; font-size: 14px; color: #555;`;
    label.innerHTML = `Appearances of the target pattern are shown in <strong style="color: #b91c1c;">red</strong>. Appearances of other patterns are shown in <strong style="color: green">green</strong>. Remaining notes are shown in <strong style="color: #1d4ed8;">blue</strong>.`;

    const link = document.createElement("a");
    link.href = midPath;
    link.download = assetName;
    link.textContent = 'Download MIDI';
    link.style.cssText = `font-size: 14px; color: #888; text-decoration: underline;`;

    row.appendChild(label);
    row.appendChild(link);

    player.insertAdjacentElement("afterend", row);
}

/**
 * Navigate back to selection page
 */
function backToSelection() {
    window.location.href = '../../index.html?noIntro=true';
}

/**
 * Initialize player UI and restrict controls
 */
function initPlayer() {
    // Disable file management
    player.player?.setPermissions?.({canAddFiles: false, canRemoveFiles: false});

    // Hide the files panel entirely
    const fileToggle = player.shadowRoot?.querySelector('[data-role="file-toggle"]');
    if (fileToggle) fileToggle.style.display = 'none';

    // Re-apply permissions
    player.player?.setPermissions?.({canAddFiles: false, canRemoveFiles: false});

    // Remove A-B loop controls
    const shadow = player.shadowRoot;
    const abButton = shadow?.querySelector('[title="Toggle A-B Loop Mode"]');
    if (abButton) abButton.closest('div[style*="gap: 6px"]')?.remove();

    // Remove "Show notes" dropdown
// Find the span containing "Show notes:" and get the next select sibling
    const showNotesLabel = Array.from(shadow?.querySelectorAll('span') || [])
        .find(span => span.textContent.includes('Show notes:'));
    const showNotesSelect = showNotesLabel?.nextElementSibling;
    if (showNotesSelect?.tagName === 'SELECT') {
        showNotesSelect.closest('div[style*="gap: 8px"]')?.remove();
    }

    // Remove settings button
    const settingsBtn = shadow?.querySelector('button[title="Settings"]');
    if (settingsBtn) settingsBtn.closest('div[style*="gap: 4px"]')?.remove();

    // Patch tempo control to show multiplier instead of BPM
    patchTempoControl(shadow);
}

/**
 * Patch the tempo control to display as speed multiplier (x speed) instead of BPM
 * @param {ShadowRoot} shadow - Shadow DOM root of player
 * @param {number} baseBpm - Base BPM for calculations (default 120)
 */
function patchTempoControl(shadow, baseBpm = 120) {
    const tempoBtn = shadow?.querySelector('button[title="Playback Tempo"]');
    if (!tempoBtn) return;

    const popover = tempoBtn.nextElementSibling;
    const bpmInput = popover?.querySelector('input[type="number"]');
    let decBtn = popover?.querySelector('button[title="Decrease tempo"]');
    let incBtn = popover?.querySelector('button[title="Increase tempo"]');
    if (!bpmInput) return;

    const toFraction = (bpm) => (bpm / baseBpm).toFixed(2);
    const toBpm = (frac) => Math.round(parseFloat(frac) * baseBpm);

    const updateBtn = (bpm) => {
        tempoBtn.textContent = `${toFraction(bpm)}x`;
        tempoBtn.setAttribute('aria-label', `Playback speed: ${toFraction(bpm)}x`);
    };
    updateBtn(parseFloat(bpmInput.value) || baseBpm);

    // Create a fraction input to replace the BPM one visually
    const fracInput = document.createElement('input');
    fracInput.type = 'number';
    fracInput.min = '0.10';
    fracInput.max = '2.50';
    fracInput.step = '0.05';
    fracInput.value = toFraction(parseFloat(bpmInput.value) || baseBpm);
    fracInput.style.cssText = bpmInput.style.cssText;
    fracInput.className = bpmInput.className;
    bpmInput.style.display = 'none';
    bpmInput.insertAdjacentElement('afterend', fracInput);

    // Change "BPM" label to "x speed"
    const bpmLabel = popover?.querySelector('span');
    if (bpmLabel) bpmLabel.textContent = 'x speed';

    const syncToBpm = (frac) => {
        const bpm = toBpm(frac);
        bpmInput.value = bpm;
        bpmInput.dispatchEvent(new Event('input', {bubbles: true}));
        bpmInput.dispatchEvent(new Event('change', {bubbles: true}));
        updateBtn(bpm);
    };

    fracInput.addEventListener('input', (e) => syncToBpm(e.target.value));
    fracInput.addEventListener('change', (e) => syncToBpm(e.target.value));

    // Clone +/- buttons to strip original BPM handlers, replace with fraction ones
    [decBtn, incBtn].forEach((btn, i) => {
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        clone.addEventListener('click', () => {
            const delta = i === 0 ? -0.05 : 0.05;
            const newVal = Math.min(2.5, Math.max(0.1, parseFloat(fracInput.value) + delta)).toFixed(2);
            fracInput.value = newVal;
            syncToBpm(newVal);
        });
    });
}

/**
 * Navigate to style analysis page
 */
function toStylePage() {
    window.location.href = window.location.href.replace("/melody/", "/style/");
}

// Spacebar playback control
document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    // Don't fire if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    e.preventDefault();

    const playBtn = player.shadowRoot?.querySelector(
        'button[style*="rgb(37, 99, 235)"], button[style*="rgb(40, 167, 69)"]'
    );
    playBtn?.click();
});