import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get all configurations for a business
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const configurations = await prisma.configuration.findMany({
      where: { businessId },
    });

    // Convert to key-value object
    const configObj = configurations.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(configObj);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json({ error: 'Failed to fetch configurations' }, { status: 500 });
  }
}

// POST - Update or create configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, key, value, type } = body;

    if (!businessId || !key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const configuration = await prisma.configuration.upsert({
      where: {
        businessId_key: {
          businessId,
          key,
        },
      },
      update: {
        value,
        type: type || 'json',
      },
      create: {
        businessId,
        key,
        value,
        type: type || 'json',
      },
    });

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Error updating configuration:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}

// PUT - Bulk update configurations
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, configurations } = body;

    if (!businessId || !configurations) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update each configuration
    const updates = Object.entries(configurations).map(([key, value]) =>
      prisma.configuration.upsert({
        where: {
          businessId_key: {
            businessId,
            key,
          },
        },
        update: {
          value: value as any,
        },
        create: {
          businessId,
          key,
          value: value as any,
          type: 'json',
        },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error bulk updating configurations:', error);
    return NextResponse.json({ error: 'Failed to update configurations' }, { status: 500 });
  }
}
