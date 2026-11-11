import {
    Part,
    CpuDetails,
    MotherboardDetails,
    MemoryDetails,
    VideoCardDetails,
    PowerSupplyDetails,
    CaseDetails,
    BuildCompatibility
} from '@/types/build';

export function checkCompatibility(selectedParts: Part[]): BuildCompatibility {
    const issues: string[] = [];

    const cpu = selectedParts.find(p => p.category === 'CPU') as CpuDetails | undefined;
    const mobo = selectedParts.find(p => p.category === 'Motherboard') as MotherboardDetails | undefined;
    const memory = selectedParts.find(p => p.category === 'Memory') as MemoryDetails | undefined;
    const gpu = selectedParts.find(p => p.category === 'Video Card') as VideoCardDetails | undefined;
    const psu = selectedParts.find(p => p.category === 'Power Supply') as PowerSupplyDetails | undefined;
    const pcCase = selectedParts.find(p => p.category === 'Case') as CaseDetails | undefined;

    if (cpu && mobo) {
        if (cpu.socket !== mobo.socket) {
            issues.push(`Socket mismatch: ${cpu.name} requires ${cpu.socket}, but ${mobo.name} has ${mobo.socket}.`);
        }
    }

    if (mobo && memory) {
        if (mobo.memory_slots !== memory.type) {
            issues.push(`Memory mismatch: ${mobo.name} supports ${mobo.memory_slots}, but ${memory.name} is ${memory.type}.`);
        }
    }

    if (psu) {
        let totalWattage = 0;
        if (cpu) totalWattage += (cpu.estimated_wattage || 0);
        if (gpu) totalWattage += (gpu.estimated_wattage || 0);

        if (totalWattage * 1.2 > psu.wattage) {
            issues.push(`Insufficient power: Estimated draw is ${totalWattage}W. A ${psu.wattage}W PSU may not be safe. (20% buffer recommended).`);
        }
    }

    if (pcCase && gpu) {
        if (gpu.length > pcCase.max_gpu_length) {
            issues.push(`Case clearance issue: ${gpu.name} is ${gpu.length}mm long, but ${pcCase.name} only supports up to ${pcCase.max_gpu_length}mm.`);
        }
    }

    return {
        compatible: issues.length === 0,
        issues
    };
}