import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get call logs with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    const [callLogs, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.callLog.count({ where }),
    ]);

    return NextResponse.json({
      callLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return NextResponse.json({ error: 'Failed to fetch call logs' }, { status: 500 });
  }
}

// POST - Get analytics/statistics
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, startDate, endDate } = body;

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const where: any = { businessId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get statistics
    const [totalCalls, completedCalls, avgDuration, sentimentStats] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.count({ where: { ...where, status: 'completed' } }),
      prisma.callLog.aggregate({
        where: { ...where, duration: { not: null } },
        _avg: { duration: true },
      }),
      prisma.callLog.groupBy({
        by: ['sentiment'],
        where,
        _count: true,
      }),
    ]);

    // Get calls by status
    const callsByStatus = await prisma.callLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    // Get daily call volume
    const dailyCallVolume = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "CallLog"
      WHERE business_id = ${businessId}
        ${startDate ? `AND created_at >= ${new Date(startDate)}` : ''}
        ${endDate ? `AND created_at <= ${new Date(endDate)}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    return NextResponse.json({
      totalCalls,
      completedCalls,
      averageDuration: Math.round(avgDuration._avg.duration || 0),
      sentiment: sentimentStats.reduce((acc, item) => {
        acc[item.sentiment || 'unknown'] = item._count;
        return acc;
      }, {} as Record<string, number>),
      callsByStatus: callsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      dailyCallVolume,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
