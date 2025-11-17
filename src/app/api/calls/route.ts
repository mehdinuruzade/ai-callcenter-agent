import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Get user's businesses
    const businesses = await prisma.business.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const businessIds = businesses.map((b: { id: any }) => b.id);

    // Build where clause
    const where: any = {
      businessId: { in: businessIds },
    };

    if (businessId) {
      where.businessId = businessId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { fromNumber: { contains: search } },
        { toNumber: { contains: search } },
        { transcript: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch call logs
    const callLogs = await prisma.callLog.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get stats
    const stats = await prisma.callLog.aggregate({
      where: { businessId: { in: businessIds } },
      _count: true,
      _avg: { duration: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = await prisma.callLog.count({
      where: {
        businessId: { in: businessIds },
        createdAt: { gte: todayStart },
      },
    });

    return NextResponse.json({
      calls: callLogs,
      stats: {
        total: stats._count,
        avgDuration: Math.round(stats._avg.duration || 0),
        today: todayCount,
      },
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call logs' },
      { status: 500 }
    );
  }
}

// Create a test call log
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const callLog = await prisma.callLog.create({
      data: {
        callSid: `CA${Date.now()}`,
        fromNumber: body.fromNumber || '+1234567890',
        toNumber: body.toNumber || '+0987654321',
        status: body.status || 'completed',
        duration: body.duration || Math.floor(Math.random() * 300) + 30,
        transcript: body.transcript || 'This is a test call transcript.',
        summary: body.summary || 'Customer inquiry about services.',
        sentiment: body.sentiment || 'positive',
        resolvedIssue: body.resolvedIssue ?? true,
        businessId: body.businessId,
      },
    });

    return NextResponse.json(callLog, { status: 201 });
  } catch (error) {
    console.error('Error creating call log:', error);
    return NextResponse.json(
      { error: 'Failed to create call log' },
      { status: 500 }
    );
  }
}
