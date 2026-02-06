"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, endOfMonth, format, isSameDay, startOfMonth, startOfWeek } from "date-fns";

type Member = {
  id: number;
  name?: string | null;
  email?: string | null;
  departments: string[];
};

type Appointment = {
  id: string;
  subject: string;
  content?: string | null;
  startAt: string;
  endAt: string;
  status: "pending" | "approved" | "declined";
};

type Task = {
  id: string;
  title: string;
  content?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  deadlineAt?: string | null;
  status: "pending" | "approved" | "declined";
};

type DayData = {
  appointments: Appointment[];
  tasks: Task[];
  pendingAppointments: Appointment[];
  pendingTasks: Task[];
};

type MonthSummary = Record<string, { appointments: number; tasks: number }>;

type ViewMode = "day" | "month";

const emptyDayData: DayData = {
  appointments: [],
  tasks: [],
  pendingAppointments: [],
  pendingTasks: []
};

export default function HomePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [dayData, setDayData] = useState<DayData>(emptyDayData);
  const [monthSummary, setMonthSummary] = useState<MonthSummary>({});
  const [loading, setLoading] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;
  const departmentName = selectedMember?.departments[0] ?? "No department";

  useEffect(() => {
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members ?? []);
        if (data.members?.length) setSelectedMemberId(data.members[0].id);
      })
      .catch(() => setError("Failed to load team members"));
  }, []);

  useEffect(() => {
    if (selectedMemberId === null) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const dateParam = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/calendar?memberId=${selectedMemberId}&date=${dateParam}&view=${viewMode}`, {
      signal: controller.signal
    })
      .then((res) => res.json())
      .then((data) => {
        if (viewMode === "day") {
          setDayData(data.day ?? emptyDayData);
        } else {
          setMonthSummary(data.summary ?? {});
        }
      })
      .catch(() => setError("Failed to load calendar"))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [selectedMemberId, selectedDate, viewMode]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = endOfMonth(selectedDate);
    const days = [];
    let current = start;
    while (current <= end || days.length % 7 !== 0) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [selectedDate]);

  async function handleApprove(type: "appointment" | "task", id: string, status: "approved" | "declined") {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, status })
    });

    if (!res.ok) {
      setError("Approval failed");
    } else {
      setSelectedDate((prev) => new Date(prev));
    }
    setLoading(false);
  }

  async function handleCreateAppointment(form: HTMLFormElement) {
    if (selectedMemberId === null) {
      setError("Select a team member first");
      return;
    }
    const formData = new FormData(form);
    const payload = {
      subject: String(formData.get("subject") || ""),
      content: String(formData.get("content") || ""),
      startAt: String(formData.get("startAt") || ""),
      endAt: String(formData.get("endAt") || ""),
      memberId: selectedMemberId
    };

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setError("Failed to create appointment");
    } else {
      setShowAppointmentForm(false);
      setSelectedDate((prev) => new Date(prev));
    }
  }

  async function handleCreateTask(form: HTMLFormElement) {
    if (selectedMemberId === null) {
      setError("Select a team member first");
      return;
    }
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") || ""),
      content: String(formData.get("content") || ""),
      startAt: String(formData.get("startAt") || ""),
      endAt: String(formData.get("endAt") || ""),
      deadlineAt: String(formData.get("deadlineAt") || ""),
      assignedToId: selectedMemberId
    };

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setError("Failed to create task");
    } else {
      setShowTaskForm(false);
      setSelectedDate((prev) => new Date(prev));
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-2xl bg-white px-5 py-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate">Department</p>
              <h1 className="text-2xl font-semibold text-ink">{departmentName}</h1>
              <p className="text-sm text-slate">
                {selectedMember?.name ?? "Unnamed member"}
                {selectedMember?.email ? ` · ${selectedMember.email}` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedMemberId === null ? "" : String(selectedMemberId)}
                onChange={(event) => setSelectedMemberId(Number(event.target.value))}
                className="rounded-lg border border-slate/10 bg-white px-3 py-2 text-sm"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name ?? member.email ?? String(member.id)}
                  </option>
                ))}
              </select>
              <div className="flex rounded-lg bg-mist p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode("day")}
                  className={`rounded-md px-3 py-2 ${viewMode === "day" ? "bg-white shadow" : "text-slate"}`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("month")}
                  className={`rounded-md px-3 py-2 ${viewMode === "month" ? "bg-white shadow" : "text-slate"}`}
                >
                  Monthly
                </button>
              </div>
              <input
                type="date"
                className="rounded-lg border border-slate/10 bg-white px-3 py-2 text-sm"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={(event) => setSelectedDate(new Date(`${event.target.value}T00:00:00`))}
              />
            </div>
          </div>
        </header>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowAppointmentForm((prev) => !prev)}
            className="rounded-full bg-ocean px-4 py-2 text-sm font-semibold text-white"
          >
            Book appointment
          </button>
          <button
            type="button"
            onClick={() => setShowTaskForm((prev) => !prev)}
            className="rounded-full bg-tide px-4 py-2 text-sm font-semibold text-white"
          >
            Give task
          </button>
          {loading ? <span className="text-sm text-slate">Loading…</span> : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </section>

        {showAppointmentForm ? (
          <form
            className="rounded-2xl bg-white p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateAppointment(event.currentTarget);
            }}
          >
            <h2 className="text-lg font-semibold text-ink">New appointment</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                name="subject"
                placeholder="Subject"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
                required
              />
              <input
                name="content"
                placeholder="Content"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
              />
              <input
                name="startAt"
                type="datetime-local"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
                required
              />
              <input
                name="endAt"
                type="datetime-local"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="rounded-lg bg-ocean px-4 py-2 text-sm font-semibold text-white">
                Create
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate/20 px-4 py-2 text-sm"
                onClick={() => setShowAppointmentForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {showTaskForm ? (
          <form
            className="rounded-2xl bg-white p-5 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateTask(event.currentTarget);
            }}
          >
            <h2 className="text-lg font-semibold text-ink">New task</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                name="title"
                placeholder="Title"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
                required
              />
              <input
                name="content"
                placeholder="Content"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
              />
              <input
                name="startAt"
                type="datetime-local"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
              />
              <input
                name="endAt"
                type="datetime-local"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
              />
              <input
                name="deadlineAt"
                type="datetime-local"
                className="rounded-lg border border-slate/10 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" className="rounded-lg bg-tide px-4 py-2 text-sm font-semibold text-white">
                Create
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate/20 px-4 py-2 text-sm"
                onClick={() => setShowTaskForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {viewMode === "day" ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Confirmed appointments</h2>
              <div className="mt-3 space-y-3">
                {dayData.appointments.length ? (
                  dayData.appointments.map((appt) => (
                    <div key={appt.id} className="rounded-xl border border-slate/10 p-3">
                      <p className="text-sm font-semibold text-ink">{appt.subject}</p>
                      <p className="text-xs text-slate">
                        {format(new Date(appt.startAt), "HH:mm")} - {format(new Date(appt.endAt), "HH:mm")}
                      </p>
                      {appt.content ? <p className="text-sm text-slate">{appt.content}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate">No confirmed appointments</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Confirmed tasks</h2>
              <div className="mt-3 space-y-3">
                {dayData.tasks.length ? (
                  dayData.tasks.map((task) => (
                    <div key={task.id} className="rounded-xl border border-slate/10 p-3">
                      <p className="text-sm font-semibold text-ink">{task.title}</p>
                      {task.deadlineAt ? (
                        <p className="text-xs text-slate">Deadline: {format(new Date(task.deadlineAt), "PPp")}</p>
                      ) : null}
                      {task.content ? <p className="text-sm text-slate">{task.content}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate">No confirmed tasks</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-sand p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Pending approvals</h2>
              <div className="mt-3 space-y-4">
                {dayData.pendingAppointments.map((appt) => (
                  <div key={appt.id} className="rounded-xl border border-slate/10 bg-white p-3">
                    <p className="text-sm font-semibold">Appointment: {appt.subject}</p>
                    <p className="text-xs text-slate">
                      {format(new Date(appt.startAt), "HH:mm")} - {format(new Date(appt.endAt), "HH:mm")}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-ocean px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => handleApprove("appointment", appt.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate/20 px-3 py-1 text-xs"
                        onClick={() => handleApprove("appointment", appt.id, "declined")}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}

                {dayData.pendingTasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-slate/10 bg-white p-3">
                    <p className="text-sm font-semibold">Task: {task.title}</p>
                    {task.deadlineAt ? (
                      <p className="text-xs text-slate">Deadline: {format(new Date(task.deadlineAt), "PPp")}</p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-ocean px-3 py-1 text-xs font-semibold text-white"
                        onClick={() => handleApprove("task", task.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-slate/20 px-3 py-1 text-xs"
                        onClick={() => handleApprove("task", task.id, "declined")}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}

                {!dayData.pendingAppointments.length && !dayData.pendingTasks.length ? (
                  <p className="text-sm text-slate">No pending approvals</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Monthly view</h2>
            <div className="mt-4 grid grid-cols-7 gap-2 text-xs font-semibold text-slate">
              {[
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
                "Sun"
              ].map((day) => (
                <span key={day} className="text-center">
                  {day}
                </span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const summary = monthSummary[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode("day");
                    }}
                    className={`min-h-[90px] rounded-xl border p-2 text-left text-xs ${
                      isSameDay(day, selectedDate)
                        ? "border-ocean bg-sand"
                        : "border-slate/10 bg-mist"
                    }`}
                  >
                    <span className="font-semibold text-ink">{format(day, "d")}</span>
                    <div className="mt-2 space-y-1 text-[11px] text-slate">
                      <p>Appointments: {summary?.appointments ?? 0}</p>
                      <p>Tasks: {summary?.tasks ?? 0}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
