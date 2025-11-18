import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch AI configuration
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

    // Get all configurations for this business
    const configurations = await prisma.configuration.findMany({
      where: { businessId },
    });

    // Convert to object format
    const config: any = {};
    configurations.forEach((c: any) => {
      try {
        // Try to parse JSON values
        config[c.key] = JSON.parse(c.value);
      } catch {
        // If not JSON, use as string
        config[c.key] = c.value;
      }
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// POST - Save AI configuration
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, config } = body;

    if (!businessId || !config) {
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

    // Update or create each configuration
    const configKeys = Object.keys(config);
    const operations = configKeys.map((key) => {
      let value = config[key];
      
      // Convert to string (serialize objects/arrays as JSON)
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }

      return prisma.configuration.upsert({
        where: {
          businessId_key: {
            businessId,
            key,
          },
        },
        update: {
          value,
        },
        create: {
          businessId,
          key,
          value,
        },
      });
    });

    await prisma.$transaction(operations);

    console.log(`✅ Updated ${operations.length} configuration(s) for business: ${business.name}`);

    return NextResponse.json({
      message: 'Configuration saved successfully',
      updated: operations.length,
    });
  } catch (error) {
    console.error('Error saving AI config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}