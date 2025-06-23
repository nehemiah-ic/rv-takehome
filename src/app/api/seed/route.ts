import { NextResponse } from "next/server";
import { initializeDataSource } from "../../../data-source";
import { Deal } from "../../../lib/entities/deals/Deal";

// Function to auto-assign territory based on origin city
function assignTerritory(originCity: string): string {
  const city = originCity.toLowerCase();
  
  // West Coast
  if (city.includes('los angeles') || city.includes('seattle') || city.includes('san francisco') || 
      city.includes('portland') || city.includes('sacramento')) {
    return 'West Coast';
  }
  
  // East Coast  
  if (city.includes('new york') || city.includes('boston') || city.includes('miami') || 
      city.includes('philadelphia') || city.includes('atlanta')) {
    return 'East Coast';
  }
  
  // Midwest
  if (city.includes('chicago') || city.includes('detroit') || city.includes('minneapolis') || 
      city.includes('milwaukee') || city.includes('cleveland')) {
    return 'Midwest';
  }
  
  // South
  if (city.includes('houston') || city.includes('dallas') || city.includes('austin') || 
      city.includes('phoenix') || city.includes('denver')) {
    return 'South';
  }
  
  // Southwest
  if (city.includes('phoenix') || city.includes('las vegas') || city.includes('albuquerque')) {
    return 'Southwest';
  }
  
  // Default for unmatched cities
  return 'Other';
}

const sampleDeals = [
  {
    deal_id: "RV-001",
    company_name: "Pacific Logistics Inc",
    contact_name: "Sarah Chen",
    transportation_mode: "ocean",
    stage: "proposal",
    value: 45000,
    probability: 70,
    created_date: "2024-10-15T09:00:00Z",
    updated_date: "2024-11-28T14:30:00Z",
    expected_close_date: "2024-12-15T00:00:00Z",
    sales_rep: "Mike Rodriguez",
    origin_city: "Los Angeles, CA",
    destination_city: "Shanghai, China",
    cargo_type: "Electronics",
  },
  {
    deal_id: "RV-002",
    company_name: "Mountain Transport Co",
    contact_name: "David Park",
    transportation_mode: "trucking",
    stage: "negotiation",
    value: 12000,
    probability: 85,
    created_date: "2024-11-01T11:15:00Z",
    updated_date: "2024-12-03T16:45:00Z",
    expected_close_date: "2024-12-10T00:00:00Z",
    sales_rep: "Jennifer Walsh",
    origin_city: "Denver, CO",
    destination_city: "Phoenix, AZ",
    cargo_type: "Machinery",
  },
  {
    deal_id: "RV-003",
    company_name: "Global Freight Solutions",
    contact_name: "Maria Rodriguez",
    transportation_mode: "air",
    stage: "prospect",
    value: 75000,
    probability: 30,
    created_date: "2024-11-20T08:30:00Z",
    updated_date: "2024-11-25T10:15:00Z",
    expected_close_date: "2025-01-20T00:00:00Z",
    sales_rep: "Tom Wilson",
    origin_city: "Miami, FL",
    destination_city: "London, UK",
    cargo_type: "Pharmaceuticals",
  },
  {
    deal_id: "RV-004",
    company_name: "Midwest Rail Corp",
    contact_name: "James Thompson",
    transportation_mode: "rail",
    stage: "qualified",
    value: 28000,
    probability: 60,
    created_date: "2024-11-10T14:20:00Z",
    updated_date: "2024-11-30T09:45:00Z",
    expected_close_date: "2024-12-25T00:00:00Z",
    sales_rep: "Lisa Anderson",
    origin_city: "Chicago, IL",
    destination_city: "Houston, TX",
    cargo_type: "Automotive Parts",
  },
  {
    deal_id: "RV-005",
    company_name: "Coastal Shipping LLC",
    contact_name: "Robert Kim",
    transportation_mode: "ocean",
    stage: "closed_won",
    value: 95000,
    probability: 100,
    created_date: "2024-10-05T12:00:00Z",
    updated_date: "2024-11-15T16:30:00Z",
    expected_close_date: "2024-11-30T00:00:00Z",
    sales_rep: "Mike Rodriguez",
    origin_city: "Seattle, WA",
    destination_city: "Tokyo, Japan",
    cargo_type: "Consumer Goods",
  },
  {
    deal_id: "RV-006",
    company_name: "Express Trucking Inc",
    contact_name: "Amanda Foster",
    transportation_mode: "trucking",
    stage: "closed_lost",
    value: 18000,
    probability: 0,
    created_date: "2024-09-15T10:30:00Z",
    updated_date: "2024-11-20T14:00:00Z",
    expected_close_date: "2024-11-01T00:00:00Z",
    sales_rep: "Jennifer Walsh",
    origin_city: "Atlanta, GA",
    destination_city: "New York, NY",
    cargo_type: "Food Products",
  },
  {
    deal_id: "RV-007",
    company_name: "International Air Cargo",
    contact_name: "Carlos Mendez",
    transportation_mode: "air",
    stage: "proposal",
    value: 52000,
    probability: 65,
    created_date: "2024-11-05T09:15:00Z",
    updated_date: "2024-12-01T11:20:00Z",
    expected_close_date: "2024-12-20T00:00:00Z",
    sales_rep: "Tom Wilson",
    origin_city: "Dallas, TX",
    destination_city: "Frankfurt, Germany",
    cargo_type: "Technology Equipment",
  },
  {
    deal_id: "RV-008",
    company_name: "Northern Rail Services",
    contact_name: "Emily Johnson",
    transportation_mode: "rail",
    stage: "prospect",
    value: 33000,
    probability: 25,
    created_date: "2024-11-25T13:45:00Z",
    updated_date: "2024-12-02T15:30:00Z",
    expected_close_date: "2025-01-15T00:00:00Z",
    sales_rep: "Lisa Anderson",
    origin_city: "Minneapolis, MN",
    destination_city: "Portland, OR",
    cargo_type: "Raw Materials",
  },
  {
    deal_id: "RV-009",
    company_name: "Atlantic Shipping Co",
    contact_name: "Michael Brown",
    transportation_mode: "ocean",
    stage: "qualified",
    value: 67000,
    probability: 55,
    created_date: "2024-10-20T11:00:00Z",
    updated_date: "2024-11-28T13:15:00Z",
    expected_close_date: "2024-12-30T00:00:00Z",
    sales_rep: "Mike Rodriguez",
    origin_city: "Boston, MA",
    destination_city: "Rotterdam, Netherlands",
    cargo_type: "Industrial Equipment",
  },
  {
    deal_id: "RV-010",
    company_name: "Southwest Logistics",
    contact_name: "Jessica Martinez",
    transportation_mode: "trucking",
    stage: "negotiation",
    value: 22000,
    probability: 80,
    created_date: "2024-11-12T16:20:00Z",
    updated_date: "2024-12-04T10:45:00Z",
    expected_close_date: "2024-12-18T00:00:00Z",
    sales_rep: "Jennifer Walsh",
    origin_city: "Phoenix, AZ",
    destination_city: "Las Vegas, NV",
    cargo_type: "Construction Materials",
  },
];

export async function POST() {
  try {
    const dataSource = await initializeDataSource();
    const dealRepository = dataSource.getRepository(Deal);

    // Clear existing data
    await dealRepository.clear();
    console.log("Cleared existing deals");

    // Insert sample data with auto-assigned territories
    for (const dealData of sampleDeals) {
      const dealWithTerritory = {
        ...dealData,
        territory: assignTerritory(dealData.origin_city)
      };
      const deal = dealRepository.create(dealWithTerritory);
      await dealRepository.save(deal);
    }

    return NextResponse.json({
      message: `Successfully seeded ${sampleDeals.length} deals`,
      count: sampleDeals.length,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database" },
      { status: 500 }
    );
  }
}
