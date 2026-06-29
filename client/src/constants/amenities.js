/**
 * amenities.js — shared amenity definitions
 * Place at: src/constants/amenities.js  (or wherever your constants live)
 *
 * Icons use CsLineIcons names. If an icon isn't available, 'star' is used as fallback.
 */

export const AMENITY_GROUPS = [
    {
        group: 'Bed & Bath',
        color: '#6f42c1',
        amenities: [
            { id: 'king_bed', label: 'King Bed', icon: 'bed' },
            { id: 'twin_beds', label: 'Twin Beds', icon: 'bed' },
            { id: 'sofa_bed', label: 'Sofa Bed', icon: 'sofa' },
            { id: 'extra_bed', label: 'Extra Bed', icon: 'plus' },
            { id: 'en_suite_bath', label: 'En Suite Bathroom', icon: 'bathtub' },
            { id: 'shower', label: 'Shower', icon: 'shower' },
            { id: 'bathtub', label: 'Bathtub', icon: 'bathtub' },
            { id: 'hot_tub', label: 'Hot Tub', icon: 'fire' },
        ],
    },
    {
        group: 'Climate & Comfort',
        color: '#17a2b8',
        amenities: [
            { id: 'air_conditioning', label: 'Air Conditioning', icon: 'wind' },
            { id: 'heating', label: 'Heating', icon: 'temperature-high' },
            { id: 'ceiling_fan', label: 'Ceiling Fan', icon: 'wind' },
            { id: 'blackout_curtains', label: 'Blackout Curtains', icon: 'eye-off' },
            { id: 'soundproofing', label: 'Soundproofing', icon: 'volume-off' },
        ],
    },
    {
        group: 'Technology',
        color: '#007bff',
        amenities: [
            { id: 'wifi', label: 'WiFi', icon: 'wifi' },
            { id: 'smart_tv', label: 'Smart TV', icon: 'monitor' },
            { id: 'cable_tv', label: 'Cable TV', icon: 'monitor' },
            { id: 'streaming', label: 'Streaming Services', icon: 'play-circle' },
            { id: 'usb_charging', label: 'USB Charging', icon: 'plug' },
            { id: 'work_desk', label: 'Work Desk', icon: 'laptop' },
            { id: 'telephone', label: 'Telephone', icon: 'phone' },
            { id: 'safe', label: 'In-Room Safe', icon: 'lock' },
        ],
    },
    {
        group: 'Kitchen & Dining',
        color: '#fd7e14',
        amenities: [
            { id: 'kitchenette', label: 'Kitchenette', icon: 'food' },
            { id: 'full_kitchen', label: 'Full Kitchen', icon: 'food' },
            { id: 'microwave', label: 'Microwave', icon: 'temperature-high' },
            { id: 'minibar', label: 'Minibar', icon: 'cup' },
            { id: 'coffee_maker', label: 'Coffee Maker', icon: 'cup' },
            { id: 'kettle', label: 'Electric Kettle', icon: 'temperature-high' },
            { id: 'refrigerator', label: 'Refrigerator', icon: 'box' },
            { id: 'dining_area', label: 'Dining Area', icon: 'food' },
        ],
    },
    {
        group: 'Outdoor & Views',
        color: '#28a745',
        amenities: [
            { id: 'balcony', label: 'Balcony', icon: 'building' },
            { id: 'terrace', label: 'Terrace', icon: 'building' },
            { id: 'garden_view', label: 'Garden View', icon: 'leaf' },
            { id: 'sea_view', label: 'Sea View', icon: 'water' },
            { id: 'pool_view', label: 'Pool View', icon: 'water' },
            { id: 'city_view', label: 'City View', icon: 'building' },
            { id: 'private_garden', label: 'Private Garden', icon: 'leaf' },
            { id: 'outdoor_seating', label: 'Outdoor Seating', icon: 'sofa' },
        ],
    },
    {
        group: 'Recreation & Wellness',
        color: '#e83e8c',
        amenities: [
            { id: 'pool_access', label: 'Pool Access', icon: 'water' },
            { id: 'gym_access', label: 'Gym Access', icon: 'fitness' },
            { id: 'spa_access', label: 'Spa Access', icon: 'heart' },
            { id: 'yoga_mat', label: 'Yoga Mat', icon: 'heart' },
            { id: 'bicycle', label: 'Bicycle', icon: 'navigate' },
        ],
    },
    {
        group: 'Services',
        color: '#6c757d',
        amenities: [
            { id: 'room_service', label: 'Room Service', icon: 'bell' },
            { id: 'daily_housekeeping', label: 'Daily Housekeeping', icon: 'star' },
            { id: 'laundry', label: 'Laundry Service', icon: 'refresh' },
            { id: 'iron', label: 'Iron & Board', icon: 'star' },
            { id: 'butler_service', label: 'Butler Service', icon: 'user' },
            { id: 'concierge', label: 'Concierge', icon: 'user' },
            { id: 'parking', label: 'Parking', icon: 'car' },
            { id: 'airport_transfer', label: 'Airport Transfer', icon: 'car' },
            { id: 'pet_friendly', label: 'Pet Friendly', icon: 'paw' },
            { id: 'accessibility', label: 'Accessible Room', icon: 'heart' },
        ],
    },
];

/** Flat list of all predefined amenities */
export const ALL_AMENITIES = AMENITY_GROUPS.flatMap(g =>
    g.amenities.map(a => ({ ...a, group: g.group, groupColor: g.color }))
);

/** Quick id → amenity lookup */
export const AMENITY_MAP = Object.fromEntries(ALL_AMENITIES.map(a => [a.id, a]));

/**
 * Normalize raw amenities from DB (array, comma-string, or Mixed object) → string[]
 */
export const normalizeAmenities = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof raw === 'object') return Object.values(raw).map(String).filter(Boolean);
    return [];
};

/**
 * Given an amenity id or free-text label, return display info.
 * Falls back to { label: the string, icon: 'star' } for custom entries.
 */
export const getAmenityInfo = (idOrLabel) => {
    if (!idOrLabel) return { id: '', label: '', icon: 'star', groupColor: '#adb5bd' };
    if (AMENITY_MAP[idOrLabel]) return AMENITY_MAP[idOrLabel];
    const byLabel = ALL_AMENITIES.find(
        a => a.label.toLowerCase() === String(idOrLabel).toLowerCase()
    );
    if (byLabel) return byLabel;
    return { id: idOrLabel, label: idOrLabel, icon: 'star', group: 'Custom', groupColor: '#adb5bd' };
};