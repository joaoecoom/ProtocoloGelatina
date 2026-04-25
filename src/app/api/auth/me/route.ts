import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      isSuperAdmin: user.isSuperAdmin,
      onboardingCompleted: user.onboardingCompleted,
      age: user.age,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      goalWeightKg: user.goalWeightKg,
      goal: user.goal,
      mainProblem: user.mainProblem,
      streak: user.streak,
      lastGelatinaAt: user.lastGelatinaAt,
      startWeightKg: user.startWeightKg,
    },
  });
}
