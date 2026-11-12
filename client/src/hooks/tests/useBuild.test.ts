import { renderHook, act } from '@testing-library/react-native';
import { useBuild } from '@/hooks/useBuild';
import { CpuDetails, MotherboardDetails } from '@/types/build';

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

    it('replaces a selected part with another in the same category', async () => {
        const { result } = await renderHook(() => useBuild());
        const replacementCpu = { ...mockCpu, part_id: 'cpu-2', price: 400 };
        await act(async () => {
            result.current.addPart(mockCpu);
            result.current.addPart(replacementCpu);
        });

        expect(result.current.selectedParts).toEqual([replacementCpu]);
        expect(result.current.getTotalPrice()).toBe(400);
    });

    it('clears selected parts and resets the total', async () => {
        const { result } = await renderHook(() => useBuild());
        await act(async () => {
            result.current.addPart(mockCpu);
            result.current.addPart(mockMobo);
        });
        await act(async () => {
            result.current.clearBuild();
        });
        expect(result.current.selectedParts).toEqual([]);
        expect(result.current.getTotalPrice()).toBe(0);
    });
});