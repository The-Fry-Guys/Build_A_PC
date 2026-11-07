import { renderHook, act } from '@testing-library/react-native';
import { useBuild } from '@/hooks/useBuild';
import { CpuDetails, MotherboardDetails, PowerSupplyDetails } from '@/types/build';

describe('useBuild Hook', () => {
    const mockCpu: CpuDetails = {
        part_id: 'cpu-1',
        category: 'CPU',
        name: 'Test CPU',
        price: 300.00,
        socket: 'AM5',
        estimated_wattage: 100,
    };

    const mockMobo: MotherboardDetails = {
        part_id: 'mobo-1',
        category: 'Motherboard',
        name: 'Test Motherboard',
        price: 200.00,
        socket: 'AM5',
        memory_slots: 'DDR5',
    };

    const mockIncompatibleMobo: MotherboardDetails = {
        part_id: 'mobo-2',
        category: 'Motherboard',
        name: 'Incompatible Motherboard',
        price: 150.00,
        socket: 'LGA1700',
        memory_slots: 'DDR4',
    };

    it('initializes with an empty build', async () => {
        const { result } = await renderHook(() => useBuild());
        expect(result.current.selectedParts.length).toBe(0);
        expect(result.current.getTotalPrice()).toBe(0);
    });

    it('adds parts and calculates total price correctly', async () => {
        const { result } = await renderHook(() => useBuild());

        await act(async () => {
            result.current.addPart(mockCpu);
        });
        expect(result.current.selectedParts.length).toBe(1);
        expect(result.current.getTotalPrice()).toBe(300.00);

        await act(async () => {
            result.current.addPart(mockMobo);
        });
        expect(result.current.selectedParts.length).toBe(2);
        expect(result.current.getTotalPrice()).toBe(500.00);
    });

    it('removes parts by ID', async () => {
        const { result } = await renderHook(() => useBuild());

        await act(async () => {
            result.current.addPart(mockCpu);
            result.current.addPart(mockMobo);
        });

        await act(async () => {
            result.current.removePart('cpu-1');
        });

        expect(result.current.selectedParts.length).toBe(1);
        expect(result.current.selectedParts[0].part_id).toBe('mobo-1');
        expect(result.current.getTotalPrice()).toBe(200.00);
    });

    it('returns a successful compatibility status for matching parts', async () => {
        const { result } = await renderHook(() => useBuild());

        await act(async () => {
            result.current.addPart(mockCpu);
            result.current.addPart(mockMobo);
        });

        const compatibility = result.current.getCompatibility();
        expect(compatibility.compatible).toBe(true);
        expect(compatibility.issues.length).toBe(0);
    });

    it('returns warnings when incompatible parts are added', async () => {
        const { result } = await renderHook(() => useBuild());

        await act(async () => {
            result.current.addPart(mockCpu); // AM5
            result.current.addPart(mockIncompatibleMobo); // LGA1700
        });

        const compatibility = result.current.getCompatibility();
        expect(compatibility.compatible).toBe(false);
        expect(compatibility.issues[0]).toContain('Socket mismatch');
    });
});