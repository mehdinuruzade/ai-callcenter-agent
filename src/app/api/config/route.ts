import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get all configurations for a business
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get all configurations
    const configs = await prisma.configuration.findMany({
      where: { businessId },
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object for easier frontend use
    const configObject: Record<string, unknown> = {};
    configs.forEach((config: { key: string; value: unknown }) => {
      configObject[config.key] = config.value;
    });

    return NextResponse.json({
      configs: configObject,
      raw: configs, // Also send raw for editing
    });
  } catch (error) {
    console.error('Error fetching configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configurations' },
      { status: 500 }
    );
  }
}

// POST - Create or update configuration
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, key, value, type } = body;

    if (!businessId || !key || value === undefined || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Upsert configuration
    const config = await prisma.configuration.upsert({
      where: {
        businessId_key: {
          businessId,
          key,
        },
      },
      update: {
        value,
        type,
      },
      create: {
        businessId,
        key,
        value,
        type,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

// PUT - Batch update configurations
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, configs } = body;

    if (!businessId || !configs) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Update all configs in transaction
    await prisma.$transaction(
      Object.entries(configs).map(([key, config]: [string, any]) =>
        prisma.configuration.upsert({
          where: {
            businessId_key: {
              businessId,
              key,
            },
          },
          update: {
            value: config.value,
            type: config.type,
          },
          create: {
            businessId,
            key,
            value: config.value,
            type: config.type,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Configurations updated' });
  } catch (error) {
    console.error('Error updating configs:', error);
    return NextResponse.json(
      { error: 'Failed to update configurations' },
      { status: 500 }
    );
  }
}
