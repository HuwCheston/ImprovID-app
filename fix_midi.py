import math
import mido
from collections import defaultdict, deque
from pathlib import Path
from tqdm import tqdm


def get_tempo(midi_file):
    for track in midi_file.tracks:
        for msg in track:
            if msg.type == 'set_tempo':
                return msg.tempo
    return 500000


def secs_to_ticks(secs, tpb, tempo):
    return math.ceil(secs * tpb * 1_000_000 / tempo)


def is_note_off(msg):
    return msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0)


def is_note_on(msg):
    return msg.type == 'note_on' and msg.velocity > 0


def to_absolute(track):
    events, t = [], 0
    for msg in track:
        t += msg.time
        events.append([t, msg])
    return events


def to_delta(abs_events):
    new_track = mido.MidiTrack()
    prev = 0
    for abs_t, msg in abs_events:
        new_track.append(msg.copy(time=abs_t - prev))
        prev = abs_t
    return new_track


def extend_short_notes(track, min_ticks, orphan_ticks):
    abs_events = to_absolute(track)

    indexed = sorted(enumerate(abs_events), key=lambda x: (x[1][0], 0 if is_note_on(x[1][1]) else 1))

    pending = defaultdict(deque)
    pair_map = {}
    matched_on_indices = set()
    orphan_off_indices = set()

    for orig_i, (abs_t, msg) in indexed:
        if is_note_on(msg):
            pending[(msg.channel, msg.note)].append((abs_t, msg.velocity, orig_i))
        elif is_note_off(msg):
            key = (msg.channel, msg.note)
            if pending[key]:
                on_t, vel, on_i = pending[key].popleft()
                pair_map[orig_i] = (on_t, vel, on_i)
                matched_on_indices.add(on_i)
            else:
                orphan_off_indices.add(orig_i)

    note_events = []

    for off_i, (on_t, vel, on_i) in pair_map.items():
        _, on_msg = abs_events[on_i]
        off_t = abs_events[off_i][0]
        if off_t - on_t < min_ticks:
            off_t = on_t + min_ticks
        note_events.append((on_t,  mido.Message('note_on',  channel=on_msg.channel, note=on_msg.note, velocity=vel, time=0)))
        note_events.append((off_t, mido.Message('note_off', channel=on_msg.channel, note=on_msg.note, velocity=0,   time=0)))

    for i, (abs_t, msg) in enumerate(abs_events):
        if is_note_on(msg) and i not in matched_on_indices:
            off_t = abs_t + orphan_ticks
            note_events.append((abs_t,  mido.Message('note_on',  channel=msg.channel, note=msg.note, velocity=msg.velocity, time=0)))
            note_events.append((off_t,  mido.Message('note_off', channel=msg.channel, note=msg.note, velocity=0, time=0)))

    passthrough = (
        [(abs_t, msg) for abs_t, msg in abs_events if not is_note_on(msg) and not is_note_off(msg)] +
        [(abs_events[i][0], abs_events[i][1]) for i in orphan_off_indices]
    )

    all_events = sorted(passthrough + note_events,
                        key=lambda x: (x[0], 0 if is_note_off(x[1]) else 1))
    return to_delta(all_events)


def main():
    mid_root = Path("assets/midi/melody_examples")
    for mid_path in tqdm(list(mid_root.rglob("**/*.mid")), desc="Processing MIDI..."):
        ex_path = mid_path.with_stem(mid_path.stem + "_ex")

        raw = mido.MidiFile(mid_path)
        tempo = get_tempo(raw)
        tpb = raw.ticks_per_beat
        min_ticks = secs_to_ticks(0.1, tpb, tempo)
        orphan_ticks = secs_to_ticks(0.1, tpb, tempo)

        # Track 0 is the tempo track, track 1 is melody, track 2 is accompaniment
        tempo_track = raw.tracks[0]
        track1 = extend_short_notes(raw.tracks[1], min_ticks, orphan_ticks)
        track2 = extend_short_notes(raw.tracks[2], min_ticks, orphan_ticks)

        mid1 = mido.MidiFile(type=raw.type, ticks_per_beat=tpb)
        mid1.tracks = [tempo_track, track1]
        mid1.save(str(mid_path))

        mid2 = mido.MidiFile(type=raw.type, ticks_per_beat=tpb)
        mid2.tracks = [tempo_track, track2]
        mid2.save(str(ex_path))


if __name__ == "__main__":
    main()

