from pathlib import Path
from pretty_midi import PrettyMIDI, Instrument
from collections import Counter, defaultdict
from tqdm import tqdm

THRESHOLD = 0.98

mid_root = Path("assets/midi/melody_examples")
mid_files = [str(i) for i in list(mid_root.rglob("**/*.mid")) if "_ex.mid" not in str(i)]

# Step 1: load all notes once
notes_map = {}
for f in tqdm(mid_files, desc="Loading..."):
    try:
        notes = sorted(
            PrettyMIDI(f).instruments[0].notes +
            PrettyMIDI(f.replace(".mid", "_ex.mid")).instruments[0].notes,
            key=lambda x: (x.start, x.end, x.pitch, x.velocity)
        )
        notes_map[f] = [(round(n.start, 1), n.pitch) for n in notes]
    except Exception as e:
        print(f"Skipping {f}: {e}")

# Step 2: bucket by note count
buckets = defaultdict(list)
for f, notes in notes_map.items():
    buckets[len(notes)].append(f)

def notes_similarity(a, b):
    ca, cb = Counter(a), Counter(b)
    intersection = sum((ca & cb).values())
    union = sum((ca | cb).values())
    return intersection / union if union > 0 else 1.0

# Step 3: only compare files in nearby buckets
counts = sorted(buckets.keys())
duplicates = defaultdict(list)

for i, c1 in enumerate(tqdm(counts, desc="Finding duplicates...")):
    for c2 in counts[i:]:
        if c2 / c1 > (1 / THRESHOLD):
            break
        for f1 in buckets[c1]:
            for f2 in buckets[c2]:
                if f1 >= f2:
                    continue
                sim = notes_similarity(notes_map[f1], notes_map[f2])
                if sim >= THRESHOLD:
                    duplicates[f1].append(f2)
                    duplicates[f2].append(f1)

duplicates = dict(duplicates)

for f, dupes in tqdm(duplicates.items(), desc="Creating MIDI files..."):
    base = PrettyMIDI(str(f))
    pattern_base = PrettyMIDI(str(f))
    pattern_base_pairs = set(
        (float(i.start), int(i.pitch)) for i in pattern_base.instruments[0].notes
    )
    extra_notes = []

    for ex in dupes:
        if ex == f:
            continue
        elif ex.split("_")[3] == f.split("_")[3]:
            continue
        else:
            print(ex)
            ext = PrettyMIDI(str(ex))
            ext_notes = ext.instruments[0].notes
            for i in ext_notes:
                if (float(i.start), int(i.pitch)) not in pattern_base_pairs:
                    extra_notes.append(i)

    if len(extra_notes) > 0:
        newpm = PrettyMIDI(resolution=base.resolution)
        newinst = Instrument(program=base.instruments[0].program)
        newinst.notes = extra_notes
        newpm.instruments = [newinst]
        newname = f.replace(".mid", "_oth.mid")
        newpm.write(newname)
