// Remove the setAttribute + console.log lines entirely from the top
let player = document.getElementById("mplayer");
// let player2 = document.getElementById("mplayer2")
// player2.addEventListener("load", _playHandler);

function setTrack(assetPath) {
    let midPath = `../../assets/midi/melody_examples/${assetPath}`;
    let midPath2 = `../../assets/midi/melody_examples/${assetPath.replace(".mid", "_ex.mid")}`;
    // wave-roll uses `files` (JSON array), not `src`
    player.setAttribute('files', JSON.stringify([
        {path: midPath, type: 'midi', name: assetPath,},
        {path: midPath2, type: "midi", name: "ex"}
    ]));
    addDownloadLink(midPath, assetPath)
}
function formatPianistName(pianist) {
    return pianist.replace(/ /g, "_").toLowerCase()
}

function parseJSON(jsName) {
    let request = new XMLHttpRequest();
    request.open("GET", jsName, false);
    request.send(null)
    return JSON.parse(request.responseText);
}

function playExampleMidi(concept, pianist) {
    let conceptPadded = String(concept).padStart(3, '0')
    let pianistFmt = formatPianistName(pianist)
    let src = `../../assets/midi/melody_features/${pianistFmt}_${conceptPadded}.mid`
    // wave-roll uses `files` (JSON array), not `src`
    player.setAttribute('files', JSON.stringify([
        {path: src, type: 'midi', name: `${pianistFmt}_${conceptPadded}.mid`}
    ]));
}

function showInfoPopup() {
    document.getElementById('popupTitle').innerText = name;
    document.getElementById('popup').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('content').classList.add('blurred');
}

function closeInfoPopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('content').classList.remove('blurred');
}

function popSelect(concept, pianist) {
    let pianistFmt = formatPianistName(pianist)
    let jsPath = `../../assets/metadata/melody_features/${pianistFmt}.json`
    let jsonData = parseJSON(jsPath);
    let conceptData = jsonData[concept]
    let dropper = document.getElementById("dropdown-menu")
    dropper.innerHTML = "";

    document.getElementById("progressionName").innerHTML = "Pattern: " + intervalsToPitches(concept);

    for (var i in conceptData) {
        let trackData = conceptData[i];
        let opt = document.createElement('option');
        opt.value = trackData["asset_path"] + '.mid';
        opt.innerHTML = `${trackData["track_name"]} (${trackData["album_name"]}, ${trackData["recording_year"]})`
        dropper.appendChild(opt);
    }
    dropper.value = conceptData[0]["asset_path"] + '.mid'
    dropper.onchange(dropper.value)
}

function intervalsToPitches(intervals) {
    let feature_arr = JSON.parse(intervals)
    let pitch_set = [0]
    let current_pitch = 0
    for (let interval_idx in feature_arr) {
        let current_interval = feature_arr[interval_idx]
        current_pitch = current_pitch + current_interval
        pitch_set.push(current_pitch)
    }
    return "(" + pitch_set.join(", ") + ")"
}

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
    label.innerHTML = `Appearances of the pattern are shown in <strong style="color: #b91c1c;">red</strong>. All other notes are shown in <strong style="color: #1d4ed8;">blue</strong>.`;

    const link = document.createElement("a");
    link.href = midPath;
    link.download = assetName;
    link.textContent = 'Download MIDI';
    link.style.cssText = `font-size: 14px; color: #888; text-decoration: underline;`;

    row.appendChild(label);
    row.appendChild(link);

    player.insertAdjacentElement("afterend", row);
}

function backToSelection() {
    window.location.href = '../../index.html';
}

function initPlayer() {
    player.player?.setPermissions?.({canAddFiles: false, canRemoveFiles: false});

    // Hide the files panel entirely
    const fileToggle = player.shadowRoot?.querySelector('[data-role="file-toggle"]');
    if (fileToggle) fileToggle.style.display = 'none';

    // Also re-apply permissions as before
    player.player?.setPermissions?.({canAddFiles: false, canRemoveFiles: false});

    // Remove A-B loop controls
    const shadow = player.shadowRoot;
    // const abButton = shadow?.querySelector('[title="Toggle A-B Loop Mode"]');
    // if (abButton) abButton.closest('div[style*="gap: 6px"]')?.remove();

    const showNotesSelect = shadow?.querySelector('select[title*="True Positive"]');
    if (showNotesSelect) showNotesSelect.closest('div[style*="font-size: 12px"]')?.remove();

    const settingsBtn = shadow?.querySelector('button[title="Settings"]');
    if (settingsBtn) settingsBtn.closest('div[style*="gap: 4px"]')?.remove();

    patchTempoControl(shadow)
}

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
        bpmInput.dispatchEvent(new Event('input', { bubbles: true }));
        bpmInput.dispatchEvent(new Event('change', { bubbles: true }));
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


// Re-apply readonly after every load, since initializePlayer()
// may call setPermissions before uiDeps is fully ready
player.addEventListener('load', () => {
    initPlayer()
});

initPlayer()


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