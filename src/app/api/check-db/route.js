import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/Ticket";
import User from "@/models/User";
import ExamCenter from "@/models/ExamCenter";
import mongoose from "mongoose";
import { ROLES } from "@/lib/permissions";

export async function GET(request) {
  try {
    console.log("Check DB API: Starting database check");

    // Check MongoDB connection
    let dbStatus = "Not connected";
    try {
      await connectDB();
      dbStatus =
        mongoose.connection.readyState === 1 ? "Connected" : "Not connected";
      console.log("Database connection status:", dbStatus);
    } catch (connectionError) {
      console.error("Database connection error:", connectionError);
      return NextResponse.json({
        success: false,
        dbStatus: "Connection Error",
        error: connectionError.message,
      });
    }

    // Verify models and check counts
    let results = {
      dbStatus,
      models: {},
      counts: {},
      sampleData: {},
      errors: [],
    };

    // Check Ticket model
    try {
      results.models.Ticket = !!Ticket;
      const totalTickets = await Ticket.countDocuments({});
      results.counts.tickets = totalTickets;

      // Get sample tickets
      if (totalTickets > 0) {
        const sampleTickets = await Ticket.find().limit(3).lean();
        results.sampleData.tickets = sampleTickets.map((ticket) => ({
          id: ticket._id.toString(),
          title: ticket.title,
          status: ticket.status,
          createdBy: ticket.createdBy?.toString(),
          examCenter: ticket.examCenter?.toString(),
          createdAt: ticket.createdAt,
        }));
      }
    } catch (ticketError) {
      console.error("Ticket model error:", ticketError);
      results.errors.push({
        model: "Ticket",
        error: ticketError.message,
      });
    }

    // Check User model
    try {
      results.models.User = !!User;
      results.counts.users = await User.countDocuments({});
      results.counts.examCenterManagers = await User.countDocuments({
        role: ROLES.EXAM_CENTER_MANAGER,
      });

      // Sample exam center managers
      if (results.counts.examCenterManagers > 0) {
        const managers = await User.find({ role: ROLES.EXAM_CENTER_MANAGER })
          .limit(3)
          .lean();
        results.sampleData.examCenterManagers = managers.map((manager) => ({
          id: manager._id.toString(),
          name: manager.name,
          email: manager.email,
          examCenter: manager.examCenter?.toString(),
        }));
      }
    } catch (userError) {
      console.error("User model error:", userError);
      results.errors.push({
        model: "User",
        error: userError.message,
      });
    }

    // Check Exam Center model
    try {
      results.models.ExamCenter = !!ExamCenter;
      results.counts.examCenters = await ExamCenter.countDocuments({});
    } catch (centerError) {
      console.error("ExamCenter model error:", centerError);
      results.errors.push({
        model: "ExamCenter",
        error: centerError.message,
      });
    }

    // Check tickets created by exam center managers
    try {
      const examCenterManagerIds = await User.find({
        role: ROLES.EXAM_CENTER_MANAGER,
      })
        .select("_id")
        .lean();

      const managerIds = examCenterManagerIds.map((m) => m._id);
      results.counts.ticketsByManagers = await Ticket.countDocuments({
        createdBy: { $in: managerIds },
      });
    } catch (queryError) {
      console.error("Error checking tickets by managers:", queryError);
      results.errors.push({
        query: "ticketsByManagers",
        error: queryError.message,
      });
    }

    console.log("Database check complete:", results);
    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Check DB API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
