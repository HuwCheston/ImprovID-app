let player = document.getElementById("mplayer");
let vis = document.getElementById("mvis");
let playbackLine = document.getElementById("playback-line")
player.addEventListener("load", _playHandler);


function _playHandler() {
    player.stop();
    player.currentTime = 0.0;
    player.start();
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
    player.src = `../../assets/midi/melody_features/${pianistFmt}_${conceptPadded}.mid`
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

function setTrack(assetPath) {
    let midPath = `../../assets/midi/melody_examples/${assetPath}`
    player.src = midPath
    vis.src = midPath
    playbackLine.style.display = 'block'

    setInterval(() => {
        try {
            var xPos = getCurrentX();
            let rect = document.getElementById("mvis").getBoundingClientRect();
            playbackLine.style.left = Number(xPos) + Number(rect.left) + 'px';
            playbackLine.style.height = (Number(rect.height) - 5) + 'px';
        } catch (err) {
        }
    }, 100);

    setXAxis()
    addDownloadLink(midPath, assetPath)
}

function addDownloadLink(midPath, assetName) {
    const existing = document.getElementById("downloader-row");
    if (existing) {
        existing.remove();
    }

    const link = document.createElement('a');
    link.href = midPath;
    link.download = assetName;
    link.textContent = 'Download MIDI';

    link.style.cssText = `
        font-size: 16px;
        color: #888;
        user-select: none;
        text-decoration: underline;
    `;

    const row = document.createElement("div");
    row.id = "downloader-row";
    row.style.cssText = `
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 4px;
    `;
    row.appendChild(link);

    const xaxisLabels = document.getElementById("xaxis-labels");
    if (xaxisLabels) {
        xaxisLabels.insertAdjacentElement("afterend", row);
    } else {
        document.getElementById("mvis").insertAdjacentElement("afterend", row);
    }
}

function backToSelection() {
    window.location.href = '../../index.html';
}

function getCurrentX() {
    let svgIndex = null
    for (const [index, element] of vis.noteSequence.notes.entries()) {
        if (element.startTime === player.currentTime) {
            svgIndex = index
        }
    }
    return vis.visualizer.svg.children[svgIndex].getAttribute('x')
}

function setXAxis() {
    let dur = player.duration;
    let xDur = Array()

    if (dur < 5) {
        xDur = [0, 5, 10, 15, 20, 25, 30]
        dur = 30
    } else {
        let createArray = (x) => Array.from({length: Math.floor(x / 5) + 1}, (_, i) => i * 5);
        xDur = createArray(dur);
    }

    const mvis = document.getElementById("mvis");

    // Remove any previously rendered axis labels
    const existing = document.getElementById("xaxis-labels");
    if (existing) existing.remove();

    const labelContainer = document.createElement("div");
    labelContainer.id = "xaxis-labels";
    labelContainer.style.cssText = `
        position: relative;
        width: 100%;
        height: 20px;
        pointer-events: none;
    `;

    xDur.forEach(t => {
        const xPos = (t / dur) * 100;

        const label = document.createElement("span");
        label.innerText = `0:${String(t).padStart(2, "0")}`;
        label.style.cssText = `
            position: absolute;
            left: ${xPos}%;
            transform: translateX(-50%);
            font-size: 11px;
            color: #888;
            user-select: none;
        `;

        labelContainer.appendChild(label);
    });

    mvis.insertAdjacentElement("afterend", labelContainer);
}