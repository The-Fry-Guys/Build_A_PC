export interface Part {
    part_id: string;
    category: 'CPU' | 'Motherboard' | 'Memory' | 'Video Card' | 'Power Supply' | 'Case' | string;
    name: string;
    price: number;
}

export interface CpuDetails extends Part {
    category: 'CPU';
    socket: string;
    estimated_wattage: number;
}

export interface MotherboardDetails extends Part {
    category: 'Motherboard';
    socket: string;
    memory_slots: string;
}

export interface MemoryDetails extends Part {
    category: 'Memory';
    type: string;
}

export interface VideoCardDetails extends Part {
    category: 'Video Card';
    length: number;
    estimated_wattage: number;
}

export interface PowerSupplyDetails extends Part {
    category: 'Power Supply';
    wattage: number;
}

export interface CaseDetails extends Part {
    category: 'Case';
    max_gpu_length: number;
}

export interface BuildCompatibility {
    compatible: boolean;
    issues: string[];
}