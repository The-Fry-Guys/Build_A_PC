import { Part, CpuDetails, MotherboardDetails } from '@/types/build';

/* This is used for mock data! This file will be changed once the API is up and running! */
export const MOCK_PARTS: Part[] = [
    {
        part_id: '1',
        category: 'CPU',
        name: 'AMD Ryzen 7 7800X3D',
        price: 399.99,
        socket: 'AM5',
        estimated_wattage: 120
    } as CpuDetails,
    {
        part_id: '2',
        category: 'Motherboard',
        name: 'MSI MAG B650 TOMAHAWK WIFI',
        price: 219.99,
        socket: 'AM5',
        memory_slots: 'DDR5'
    } as MotherboardDetails,
    {
        part_id: '3',
        category: 'Video Card',
        name: 'NVIDIA GeForce RTX 4070 Super',
        price: 599.99,
        length: 242,
        estimated_wattage: 220
    } as any
];