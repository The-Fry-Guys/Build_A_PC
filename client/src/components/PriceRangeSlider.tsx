import React, { useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PriceRange = { min: number; max: number };

type Props = {
    domainMin: number;
    domainMax: number;
    selectedMin: number | null;
    selectedMax: number | null;
    onApply: (range: PriceRange) => void;
};

/** Displays a compact vertical two-handle price filter. */
export default function PriceRangeSlider({ domainMin, domainMax, selectedMin, selectedMax, onApply }: Props) {
    const span = Math.max(domainMax - domainMin, 1);
    const thumbRadius = 11;
    const initialRange = { min: selectedMin ?? domainMin, max: selectedMax ?? domainMax };
    const [range, setRange] = useState<PriceRange>(initialRange);
    const [height, setHeight] = useState(0);
    const [activeHandle, setActiveHandle] = useState<'min' | 'max'>('min');

    /** Moves the active handle along the vertical track and clamps it against the other handle. */
    const moveHandle = (locationY: number, handle: 'min' | 'max' = activeHandle) => {
        const usableHeight = height - thumbRadius * 2;
        if (usableHeight <= 0) return;
        const clampedY = Math.max(thumbRadius, Math.min(height - thumbRadius, locationY));
        const fractionFromTop = (clampedY - thumbRadius) / usableHeight;
        const nextPrice = Math.round((domainMax - fractionFromTop * span) * 100) / 100;
        setRange((current) => handle === 'min'
            ? { min: Math.min(nextPrice, current.max), max: current.max }
            : { min: current.min, max: Math.max(nextPrice, current.min) });
    };

    /** Selects the nearest price handle and starts tracking the vertical pointer. */
    const startDrag = (locationY: number) => {
        const usableHeight = height - thumbRadius * 2;
        const minY = thumbRadius + (1 - (range.min - domainMin) / span) * usableHeight;
        const maxY = thumbRadius + (1 - (range.max - domainMin) / span) * usableHeight;
        const nextHandle = Math.abs(locationY - minY) <= Math.abs(locationY - maxY) ? 'min' : 'max';
        setActiveHandle(nextHandle);
        moveHandle(locationY, nextHandle);
    };

    const usableHeight = height - thumbRadius * 2;
    const minPosition = thumbRadius + (1 - (range.min - domainMin) / span) * usableHeight;
    const maxPosition = thumbRadius + (1 - (range.max - domainMin) / span) * usableHeight;
    const handlesAreClose = minPosition - maxPosition < 24;
    const maxReadoutTop = Math.max(0, Math.min(height - 18, handlesAreClose ? maxPosition - 18 : maxPosition - 9));
    const minReadoutTop = Math.max(0, Math.min(height - 18, handlesAreClose ? minPosition + 3 : minPosition - 9));
    const panHandlers = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => startDrag(event.nativeEvent.locationY),
        onPanResponderMove: (event) => moveHandle(event.nativeEvent.locationY),
        onPanResponderRelease: () => undefined,
        onPanResponderTerminate: () => undefined,
    }).panHandlers;

    return <View style={styles.panel}>
        <Text style={styles.currency} accessibilityLabel="Price filter">$</Text>
        <View
            style={styles.trackTouchArea}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            {...panHandlers}
            accessibilityRole="adjustable"
            accessibilityLabel={`Price range from $${range.min.toFixed(2)} to $${range.max.toFixed(2)}; drag either handle`}
            accessibilityValue={{ min: domainMin, max: domainMax, now: range.min }}
        >
            <View style={styles.track} />
            <View style={[styles.selectedTrack, { top: maxPosition, height: Math.max(0, minPosition - maxPosition) }]} />
            <View style={[styles.handle, { top: maxPosition - 11 }]} pointerEvents="none" />
            <View style={[styles.handle, { top: minPosition - 11 }]} pointerEvents="none" />
            <Text style={[styles.readout, styles.maxReadout, { top: maxReadoutTop }]}>${range.max.toFixed(2)}</Text>
            <Text style={[styles.readout, styles.minReadout, { top: minReadoutTop }]}>${range.min.toFixed(2)}</Text>
        </View>
        <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apply price range" style={styles.applyButton}
                onPress={() => onApply({ ...range })}>
                <Text style={styles.applyText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset price range" style={styles.resetButton}
                onPress={() => onApply({ min: domainMin, max: domainMax })}>
                <Text style={styles.resetText}>↺</Text>
            </TouchableOpacity>
        </View>
    </View>;
}

const styles = StyleSheet.create({
    panel: { width: 116, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', backgroundColor: '#fff', borderColor: '#d5dbe3', borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 6 },
    currency: { color: '#253044', fontSize: 18, fontWeight: 'bold', lineHeight: 24 },
    trackTouchArea: { width: 104, height: 138, justifyContent: 'center', alignItems: 'center' },
    track: { position: 'absolute', left: 12, top: 11, bottom: 11, width: 4, borderRadius: 2, backgroundColor: '#d5dbe3' },
    selectedTrack: { position: 'absolute', left: 12, width: 4, borderRadius: 2, backgroundColor: '#1976d2' },
    handle: { position: 'absolute', left: 1, width: 22, height: 22, borderRadius: 11, borderColor: '#fff', borderWidth: 2, backgroundColor: '#1976d2', elevation: 2 },
    readout: { position: 'absolute', left: 29, width: 72, fontSize: 11, fontVariant: ['tabular-nums'] },
    maxReadout: { color: '#b42318', textAlign: 'left' },
    minReadout: { color: '#067647', textAlign: 'left' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    applyButton: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center', borderRadius: 13, backgroundColor: '#1976d2' },
    applyText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    resetButton: { width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },
    resetText: { color: '#344054', fontSize: 17 },
});
