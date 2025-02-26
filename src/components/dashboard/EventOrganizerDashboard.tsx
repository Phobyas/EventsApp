"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  BarChart3,
  QrCode,
  CreditCard,
  Settings,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Clock,
  Search,
  PlusCircle,
  Filter,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: {
    city: string;
    country: string;
  };
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_id?: string;
  order_id: string;
  ticket_type_id: string;
  user_id: string;
  used: boolean;
  created_at: string;
  ticket_type: {
    name: string;
    price: number;
  };
  user: {
    email: string;
    full_name?: string;
  };
}

interface SalesSummary {
  totalSales: number;
  totalTickets: number;
  totalRevenue: number;
  ticketTypeBreakdown: {
    name: string;
    sold: number;
    remaining: number;
    revenue: number;
  }[];
}

export function EventOrganizerPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketFilter, setTicketFilter] = useState("all"); // all, used, unused

  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login");
          return;
        }

        // Fetch events created by current user
        const { data: userEvents, error: eventsError } = await supabase
          .from("events")
          .select("id, title, date, time, location, created_at")
          .eq("user_id", session.user.id)
          .order("date", { ascending: true });

        if (eventsError) {
          throw eventsError;
        }

        if (userEvents && userEvents.length > 0) {
          setEvents(userEvents);
          // Select the most recent event by default
          setSelectedEvent(userEvents[0].id);
        } else {
          setEvents([]);
        }
      } catch (err) {
        setError("Failed to load events. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    // Fetch tickets and sales data when a new event is selected
    if (selectedEvent) {
      fetchEventData(selectedEvent);
    }
  }, [selectedEvent]);

  const fetchEventData = async (eventId: string) => {
    try {
      setIsLoading(true);

      // Fetch all tickets for this event
      const { data: ticketTypes, error: typesError } = await supabase
        .from("ticket_types")
        .select("id, name, price, quantity, remaining_quantity")
        .eq("event_id", eventId);

      if (typesError) throw typesError;

      if (!ticketTypes) {
        setTickets([]);
        setSalesSummary(null);
        return;
      }

      // Get all ticket type IDs for this event
      const ticketTypeIds = ticketTypes.map((tt) => tt.id);

      // Fetch all tickets using those ticket type IDs
      const { data: ticketData, error: ticketsError } = await supabase
        .from("tickets")
        .select(
          `
        *,
        ticket_type:ticket_type_id (name, price),
        user:user_id (email, full_name)
      `
        )
        .in("ticket_type_id", ticketTypeIds);

      if (ticketsError) throw ticketsError;

      if (ticketData) {
        setTickets(ticketData);

        // Calculate sales summary
        const totalTickets = ticketData.length;
        const totalRevenue = ticketData.reduce(
          (sum, ticket) => sum + (ticket.ticket_type?.price || 0),
          0
        );

        // Calculate breakdown by ticket type
        const breakdown = ticketTypes.map((tt) => {
          const soldTickets = ticketData.filter(
            (t) => t.ticket_type_id === tt.id
          );
          const revenue = soldTickets.reduce((sum, t) => sum + tt.price, 0);

          return {
            name: tt.name,
            sold: soldTickets.length,
            remaining: tt.remaining_quantity,
            revenue: revenue,
          };
        });

        setSalesSummary({
          totalSales: ticketData.length,
          totalTickets: ticketData.length,
          totalRevenue: totalRevenue,
          ticketTypeBreakdown: breakdown,
        });
      } else {
        setTickets([]);
        setSalesSummary(null);
      }
    } catch (err) {
      console.error("Error fetching event data:", err);
      setError("Failed to load event data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const markTicketAsUsed = async (ticketId: string, used: boolean) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ used })
        .eq("id", ticketId);

      if (error) throw error;

      // Update local state
      setTickets(
        tickets.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, used } : ticket
        )
      );
    } catch (err) {
      console.error("Error updating ticket:", err);
      setError("Failed to update ticket status. Please try again.");
    }
  };

  const verifyTicket = async (ticketCode: string) => {
    // This would connect to the ticket validation endpoint
    // For now, we'll just find the ticket in our current list
    const ticket = tickets.find(
      (t) => t.id === ticketCode || t.ticket_id === ticketCode
    );

    if (ticket) {
      if (ticket.used) {
        setError("This ticket has already been used!");
      } else {
        await markTicketAsUsed(ticket.id, true);
        setError(null);
        alert("Ticket verified successfully!");
      }
    } else {
      setError("Invalid ticket code. Please try again.");
    }
  };

  const handleTicketSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      // Apply search filter
      const searchString =
        (ticket.user?.email || "") +
        (ticket.user?.full_name || "") +
        (ticket.ticket_id || "") +
        ticket.ticket_type.name;

      const matchesSearch =
        !searchQuery ||
        searchString.toLowerCase().includes(searchQuery.toLowerCase());

      // Apply used/unused filter
      const matchesUsedFilter =
        ticketFilter === "all" ||
        (ticketFilter === "used" && ticket.used) ||
        (ticketFilter === "unused" && !ticket.used);

      return matchesSearch && matchesUsedFilter;
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (isLoading && events.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (events.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">No Events Found</h2>
        <p className="text-gray-600 mb-6">
          You haven't created any events yet.
        </p>
        <Link href="/events/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
        </Link>
      </div>
    );
  }

  const selectedEventData = events.find((event) => event.id === selectedEvent);

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Event Management</h1>
          <p className="text-gray-600">Manage your events and attendees</p>
        </div>
        <Link href="/events/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Event
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Event Selector Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.map((event) => (
                <Button
                  key={event.id}
                  variant={selectedEvent === event.id ? "default" : "outline"}
                  className="w-full justify-start mb-1"
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <div className="truncate text-left">
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          {selectedEventData && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">
                  {selectedEventData.title}
                </h2>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    {new Date(selectedEventData.date).toLocaleDateString()}
                    {selectedEventData.time && (
                      <>
                        <Clock className="h-4 w-4 mx-1" />
                        {selectedEventData.time}
                      </>
                    )}
                  </span>
                  <span className="inline-flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    {salesSummary?.totalTickets || 0} attendees
                  </span>
                  <Link
                    href={`/events/${selectedEventData.id}`}
                    className="inline-flex items-center text-sm text-blue-600"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    View Event Page
                  </Link>
                </div>
              </div>

              <Tabs defaultValue="attendees">
                <TabsList className="mb-4">
                  <TabsTrigger value="attendees">
                    <Users className="h-4 w-4 mr-2" />
                    Attendees
                  </TabsTrigger>
                  <TabsTrigger value="sales">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Sales
                  </TabsTrigger>
                  <TabsTrigger value="check-in">
                    <QrCode className="h-4 w-4 mr-2" />
                    Check-in
                  </TabsTrigger>
                </TabsList>

                {/* Attendees Tab */}
                <TabsContent value="attendees">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attendees</CardTitle>
                      <CardDescription>
                        Manage attendees for this event
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2 w-full max-w-sm">
                          <Input
                            placeholder="Search by name, email, or ticket ID"
                            value={searchQuery}
                            onChange={(e) => handleTicketSearch(e.target.value)}
                            className="flex-1"
                          />
                          <Select
                            value={ticketFilter}
                            onValueChange={setTicketFilter}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Tickets</SelectItem>
                              <SelectItem value="used">Used Tickets</SelectItem>
                              <SelectItem value="unused">
                                Unused Tickets
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-sm text-gray-500">
                          {filteredTickets.length} attendees
                        </div>
                      </div>

                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Attendee</TableHead>
                              <TableHead>Ticket Type</TableHead>
                              <TableHead>Purchase Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTickets.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-6 text-gray-500"
                                >
                                  No attendees found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredTickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {ticket.user?.full_name || "N/A"}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {ticket.user?.email || "No email"}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {ticket.ticket_type.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {new Date(
                                      ticket.created_at
                                    ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    {ticket.used ? (
                                      <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-green-800"
                                      >
                                        Checked in
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Not used</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant={
                                        ticket.used ? "outline" : "default"
                                      }
                                      onClick={() =>
                                        markTicketAsUsed(
                                          ticket.id,
                                          !ticket.used
                                        )
                                      }
                                    >
                                      {ticket.used
                                        ? "Mark as Unused"
                                        : "Check in"}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Total Sales
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {salesSummary?.totalTickets || 0}
                        </div>
                        <p className="text-xs text-gray-500">tickets sold</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Total Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${salesSummary?.totalRevenue.toFixed(2) || "0.00"}
                        </div>
                        <p className="text-xs text-gray-500">
                          from all ticket sales
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                          Average Price
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          $
                          {salesSummary && salesSummary.totalTickets > 0
                            ? (
                                salesSummary.totalRevenue /
                                salesSummary.totalTickets
                              ).toFixed(2)
                            : "0.00"}
                        </div>
                        <p className="text-xs text-gray-500">per ticket</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sales by Ticket Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ticket Type</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Sold</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead className="text-right">
                              Revenue
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesSummary?.ticketTypeBreakdown.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                {item.name}
                              </TableCell>
                              <TableCell>
                                ${(item.revenue / (item.sold || 1)).toFixed(2)}
                              </TableCell>
                              <TableCell>{item.sold}</TableCell>
                              <TableCell>{item.remaining}</TableCell>
                              <TableCell className="text-right">
                                ${item.revenue.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Check-in Tab */}
                <TabsContent value="check-in">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Ticket Validation</CardTitle>
                        <CardDescription>
                          Scan or enter ticket codes to check in attendees
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-12 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              Scan QR codes using your device's camera
                            </p>
                            <Button variant="outline" className="mt-4">
                              Open Camera
                            </Button>
                          </div>
                        </div>

                        <div className="relative">
                          <p className="text-sm font-medium mb-2">
                            Or enter ticket code manually:
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter ticket ID or code"
                              id="ticket-code"
                              className="flex-1"
                            />
                            <Button
                              onClick={() => {
                                const code = (
                                  document.getElementById(
                                    "ticket-code"
                                  ) as HTMLInputElement
                                )?.value;
                                if (code) verifyTicket(code);
                              }}
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Check-in Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-8">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">
                                Check-in Progress
                              </span>
                              <span className="text-sm text-gray-500">
                                {tickets.filter((t) => t.used).length} /{" "}
                                {tickets.length}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: tickets.length
                                    ? `${(tickets.filter((t) => t.used).length / tickets.length) * 100}%`
                                    : "0%",
                                }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-green-600 text-2xl font-bold">
                                {tickets.filter((t) => t.used).length}
                              </p>
                              <p className="text-green-800 text-xs">
                                Checked in
                              </p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-blue-600 text-2xl font-bold">
                                {tickets.filter((t) => !t.used).length}
                              </p>
                              <p className="text-blue-800 text-xs">
                                Not arrived
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Recent Check-ins
                            </h4>
                            <div className="space-y-2">
                              {tickets
                                .filter((t) => t.used)
                                .sort(
                                  (a, b) =>
                                    new Date(b.created_at).getTime() -
                                    new Date(a.created_at).getTime()
                                )
                                .slice(0, 3)
                                .map((ticket) => (
                                  <div
                                    key={ticket.id}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">
                                        {ticket.user?.full_name ||
                                          ticket.user?.email ||
                                          "Anonymous"}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {ticket.ticket_type.name}
                                      </p>
                                    </div>
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  </div>
                                ))}

                              {tickets.filter((t) => t.used).length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  No check-ins yet
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
