import { Ionicons } from "@expo/vector-icons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { InteractionManager, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { formatBookingTime, useBookingState } from "../components/bookings";
import { getAvailableTeeSlots, getManagedCourseById, type TeeSlot } from "../components/course-management";
import { useResponsiveLayout } from "../components/responsive-layout";
import { theme } from "../components/theme";
import { DailyWeatherForecast, getFourteenDayForecast, getWeatherCodeIconName } from "../components/weather";

const SERVICE_FEE = 12.5;
const CADDY_FEE_PER_PLAYER = 7.5;

type TimePeriod = "MORNING" | "AFTERNOON";
const DATE_CHIP_FULL_WIDTH = 72;

function toDayStart(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export default function TeeTimeBookingScreen() {
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding } = useResponsiveLayout();
  const { id, bookingId } = useLocalSearchParams<{ id?: string | string[]; bookingId?: string | string[] }>();
  const courseId = Array.isArray(id) ? id[0] : id;
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  const course = getManagedCourseById(courseId);
  const bookingState = useBookingState();
  const existingBooking = bookingState.bookings.find((item) => item.id === resolvedBookingId) ?? null;
  const [weather, setWeather] = useState<DailyWeatherForecast[]>([]);
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [slotState, setSlotState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TeeSlot[]>([]);
  const [now, setNow] = useState(() => new Date());

  const [calendarDate, setCalendarDate] = useState<Date>(() => toDayStart(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => dateKey(toDayStart(new Date())));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visibleDateIndex, setVisibleDateIndex] = useState(0);
  const [selectedPlayers, setSelectedPlayers] = useState(3);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("MORNING");
  const [selectedTime, setSelectedTime] = useState("08:00");

  const bookingDates = useMemo(() => {
    return Array.from({ length: 64 }, (_, index) => {
      const date = new Date(calendarDate);
      date.setDate(calendarDate.getDate() + index);
      return {
        key: dateKey(date),
        day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        date: date.getDate(),
        fullDate: date,
      };
    });
  }, [calendarDate]);

  const selectedDateObj = bookingDates.find((item) => item.key === selectedDateKey) ?? bookingDates[0];
  const basePrice = Number(course.price.replace(/[^0-9.]/g, "")) || 0;
  const greenFees = basePrice * selectedPlayers;
  const serviceFee = SERVICE_FEE;
  const caddyFee = Number((selectedPlayers * CADDY_FEE_PER_PLAYER).toFixed(2));
  const taxesAndFees = Number((greenFees * 0.0845).toFixed(2));
  const totalDue = Number((greenFees + serviceFee + caddyFee + taxesAndFees).toFixed(2));

  const visibleDate = bookingDates[Math.min(visibleDateIndex, bookingDates.length - 1)] ?? selectedDateObj;

  const monthYearLabel = visibleDate.fullDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const formattedBookingDate = selectedDateObj.fullDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const formattedDateTime = useMemo(() => {
    if (!selectedTime) {
      return `${selectedDateObj.day}, ${formattedBookingDate} - Time not selected`;
    }

    return `${selectedDateObj.day}, ${formattedBookingDate} - ${selectedTime} ${timePeriod === "MORNING" ? "AM" : "PM"}`;
  }, [formattedBookingDate, selectedDateObj.day, selectedTime, timePeriod]);
  const isToday = selectedDateObj.key === dateKey(toDayStart(now));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const periodSlots = useMemo(() => {
    return availableSlots
      .filter((slot) => slot.timePeriod === timePeriod)
      .map((slot) => {
        const isPastToday = isToday && parseTimeToMinutes(slot.teeTime) <= currentMinutes;
        const isExistingBookingSlot =
          existingBooking?.tee_date === selectedDateObj.key &&
          existingBooking?.tee_time.slice(0, 5) === slot.teeTime &&
          existingBooking?.time_period === slot.timePeriod;
        const isAvailable = (slot.isAvailable || isExistingBookingSlot) && !isPastToday;

        return {
          ...slot,
          isAvailable,
          isPastToday,
          isUnavailableByBooking: !slot.isAvailable && !isExistingBookingSlot,
        };
      });
  }, [availableSlots, currentMinutes, existingBooking, isToday, selectedDateObj.key, timePeriod]);
  const availableTimes = periodSlots.filter((slot) => slot.isAvailable).map((slot) => slot.teeTime);

  useEffect(() => {
    if (!existingBooking) {
      return;
    }

    const bookingDate = toDayStart(new Date(`${existingBooking.tee_date}T00:00:00`));
    const parsedTime = formatBookingTime(existingBooking.tee_time);
    const normalizedTime = parsedTime.replace(/\s?(AM|PM)$/i, "");

    setCalendarDate(bookingDate);
    setSelectedDateKey(dateKey(bookingDate));
    setVisibleDateIndex(0);
    setSelectedPlayers(existingBooking.players);
    setTimePeriod(existingBooking.time_period as TimePeriod);
    setSelectedTime(normalizedTime);
  }, [existingBooking]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      setSlotState("loading");
      setSlotError(null);

      try {
        const slots = await getAvailableTeeSlots(course.id, selectedDateObj.key);
        if (!active) {
          return;
        }

        setAvailableSlots(slots);
        setSlotState("success");
      } catch (error) {
        if (!active) {
          return;
        }

        setAvailableSlots([]);
        setSlotState("error");
        setSlotError(error instanceof Error ? error.message : "Unable to load tee slots right now.");
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [course.id, selectedDateObj.key]);

  useEffect(() => {
    if (!availableTimes.length) {
      setSelectedTime("");
      return;
    }

    if (!availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0]);
    }
  }, [availableTimes, selectedTime]);

  useEffect(() => {
    let active = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const loadWeather = async () => {
        setWeatherState("loading");

        try {
          const forecast = await getFourteenDayForecast(course.coordinates);
          if (!active) {
            return;
          }

          setWeather(forecast);
          setWeatherState("success");
        } catch {
          if (!active) {
            return;
          }

          setWeatherState("error");
        }
      };

      void loadWeather();
    });

    return () => {
      active = false;
      interactionTask.cancel();
    };
  }, [course.coordinates, course.id]);

  const applySelectedDate = (pickedDate: Date) => {
    const normalized = toDayStart(pickedDate);
    setCalendarDate(normalized);
    setSelectedDateKey(dateKey(normalized));
    setVisibleDateIndex(0);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && pickedDate) {
        applySelectedDate(pickedDate);
      }
      return;
    }

    if (pickedDate) {
      applySelectedDate(pickedDate);
    }
  };

  const handleCalendarQuickPick = () => {
    setShowDatePicker((current) => !current);
  };

  const handleConfirmBooking = () => {
    if (!selectedTime) {
      return;
    }

    router.push({
      pathname: "/booking-checkout",
      params: {
        id: course.id,
        players: String(selectedPlayers),
        date: formattedBookingDate,
        day: selectedDateObj.day,
        time: selectedTime,
        period: timePeriod,
        dateKey: selectedDateObj.key,
        bookingId: resolvedBookingId,
        subtotal: greenFees.toFixed(2),
        serviceFee: serviceFee.toFixed(2),
        caddyFee: caddyFee.toFixed(2),
        taxes: taxesAndFees.toFixed(2),
        total: totalDue.toFixed(2),
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.heroSection}>
          <AppImage source={{ uri: course.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroKicker}>BOOK TEE TIME</Text>
            <Text style={styles.heroTitle}>{course.title}</Text>

            <View style={styles.heroLocationRow}>
              <Ionicons name="location" size={14} color={theme.colors.accentSoft} />
              <Text style={styles.heroLocation}>{course.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>14-Day Weather</Text>
            <Text style={styles.sectionMeta}>Forecast</Text>
          </View>

          {weatherState === "loading" ? (
            <Text style={styles.weatherStateText}>Loading weather forecast...</Text>
          ) : null}

          {weatherState === "error" ? (
            <Text style={styles.weatherStateText}>Weather forecast is unavailable right now.</Text>
          ) : null}

          {weatherState === "success" ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weatherRow}
              bounces={false}
              overScrollMode="never"
            >
              {weather.map((day) => (
                <View key={day.dateLabel} style={styles.weatherCard}>
                  <Text style={styles.weatherDate}>{day.dateLabel}</Text>
                  <View style={styles.weatherIconWrap}>
                    <Ionicons
                      name={getWeatherCodeIconName(day.weatherCode)}
                      size={20}
                      color={theme.colors.accentWarm}
                    />
                  </View>
                  <Text style={styles.weatherTemp}>{`${day.tempMax}\u00B0`}</Text>
                  <Text style={styles.weatherMinTemp}>{`${day.tempMin}\u00B0 low`}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionMeta}>{monthYearLabel}</Text>
              <Pressable style={[styles.calendarQuickButton]} onPress={handleCalendarQuickPick} variant="chip">
                <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.calendarQuickButtonText}>Calendar</Text>
              </Pressable>
            </View>
          </View>

          {showDatePicker ? (
            <View style={styles.inlinePickerWrap}>
              <DateTimePicker
                value={selectedDateObj.fullDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={toDayStart(new Date())}
                onChange={handleDatePickerChange}
              />
              <Pressable style={[styles.inlinePickerDoneButton]} onPress={() => setShowDatePicker(false)} variant="button">
                <Text style={styles.inlinePickerDoneButtonText}>Done</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            onScroll={(event) => {
              const x = event.nativeEvent.contentOffset.x;
              const nextIndex = Math.max(0, Math.floor(x / DATE_CHIP_FULL_WIDTH));
              if (nextIndex !== visibleDateIndex) {
                setVisibleDateIndex(nextIndex);
              }
            }}
          >
            {bookingDates.map((item) => {
              const active = item.key === selectedDateKey;
              return (
                <Pressable
                  key={item.key}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => {
                    setSelectedDateKey(item.key);
                  }}
                  variant="chip"
                >
                  <Text style={[styles.dateChipDay, active && styles.dateChipDayActive]}>{item.day}</Text>
                  <Text style={[styles.dateChipDate, active && styles.dateChipDateActive]}>{item.date}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Number of Players</Text>
          <View style={styles.playersRow}>
            {[1, 2, 3, 4].map((count) => {
              const active = selectedPlayers === count;
              const iconName = count === 1 ? "person" : count === 2 ? "people" : "people-circle";

              return (
                <Pressable
                  key={count}
                  style={[styles.playerChip, active && styles.playerChipActive]}
                  onPress={() => {
                    setSelectedPlayers(count);
                  }}
                  variant="chip"
                >
                  <Ionicons
                    name={iconName as "person" | "people" | "people-circle"}
                    size={16}
                    color={active ? theme.colors.accentWarm : theme.colors.text}
                  />
                  <Text style={[styles.playerChipText, active && styles.playerChipTextActive]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Times</Text>
            <View style={styles.periodRow}>
              <Pressable
                style={[styles.periodPill, timePeriod === "MORNING" && styles.periodPillActive]}
                onPress={() => {
                  setTimePeriod("MORNING");
                  setSelectedTime("");
                }}
                variant="chip"
              >
                <Text style={[styles.periodText, timePeriod === "MORNING" && styles.periodTextActive]}>MORNING</Text>
              </Pressable>
              <Pressable
                style={[styles.periodPill, timePeriod === "AFTERNOON" && styles.periodPillActive]}
                onPress={() => {
                  setTimePeriod("AFTERNOON");
                  setSelectedTime("");
                }}
                variant="chip"
              >
                <Text style={[styles.periodText, timePeriod === "AFTERNOON" && styles.periodTextActive]}>
                  AFTERNOON
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.timeGrid}>
            {slotState === "loading" ? <Text style={styles.weatherStateText}>Loading available tee slots...</Text> : null}
            {slotState === "error" ? <Text style={styles.weatherStateText}>{slotError}</Text> : null}
            {slotState === "success" && !periodSlots.length ? (
              <Text style={styles.weatherStateText}>No tee slots configured for this period on the selected date.</Text>
            ) : null}
            {slotState === "success" && periodSlots.map((slot) => {
              const active = selectedTime === slot.teeTime;
              const disabled = !slot.isAvailable;
              return (
                <Pressable
                  key={slot.teeTime}
                  style={[
                    styles.timeChip,
                    active && styles.timeChipActive,
                    slot.isPastToday && styles.timeChipPast,
                    slot.isUnavailableByBooking && styles.timeChipBooked,
                  ]}
                  onPress={() => {
                    if (!disabled) {
                      setSelectedTime(slot.teeTime);
                    }
                  }}
                  disabled={disabled}
                  variant="chip"
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      active && styles.timeChipTextActive,
                      disabled && styles.timeChipTextDisabled,
                      slot.isUnavailableByBooking && styles.timeChipTextBooked,
                    ]}
                  >
                    {slot.teeTime}
                  </Text>
                  {slot.isUnavailableByBooking ? <View style={styles.timeChipStrike} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>

            <View style={styles.summaryMetaItem}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name="calendar" size={18} color={theme.colors.accentSoft} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>DATE & TIME</Text>
                <Text style={styles.summaryValue}>{formattedDateTime}</Text>
              </View>
            </View>

            <View style={styles.summaryMetaItem}>
              <View style={styles.summaryIconWrap}>
                <Ionicons name="person" size={18} color={theme.colors.accentSoft} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>PARTY SIZE</Text>
                <Text style={styles.summaryValue}>{selectedPlayers} Players</Text>
              </View>
            </View>

            <View style={styles.pricingSection}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingName}>Green Fees ({selectedPlayers}x)</Text>
              <Text style={styles.pricingAmount}>${greenFees.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingName}>Service Fee</Text>
              <Text style={styles.pricingAmount}>${serviceFee.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingName}>Caddy Fee</Text>
              <Text style={styles.pricingAmount}>${caddyFee.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingName}>Taxes & Fees</Text>
              <Text style={styles.pricingAmount}>${taxesAndFees.toFixed(2)}</Text>
            </View>
            <View style={[styles.pricingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Due</Text>
              <Text style={styles.totalAmount}>${totalDue.toFixed(2)}</Text>
            </View>
          </View>

          <Pressable style={[styles.confirmButton, !selectedTime && styles.confirmButtonDisabled]} onPress={handleConfirmBooking} disabled={!selectedTime} variant="cta">
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          </Pressable>

          <Text style={styles.policyText}>
            By confirming, you agree to our 24-hour cancellation policy and course etiquette guidelines.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 160,
    gap: 14,
  },
  heroSection: {
    height: 214,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayStrong,
  },
  heroContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroKicker: {
    color: theme.colors.accentSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroTitle: {
    color: theme.colors.surface,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroLocation: {
    color: theme.colors.accentSoft,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "500",
  },
  section: {
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
  },
  sectionMeta: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    letterSpacing: 1,
    fontWeight: "700",
  },
  weatherStateText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "500",
  },
  weatherRow: {
    gap: 10,
    paddingRight: 8,
  },
  weatherCard: {
    width: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceTint,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  weatherDate: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
  },
  weatherIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  weatherTemp: {
    color: theme.colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  weatherMinTemp: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "600",
  },
  calendarQuickButton: {
    height: 28,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calendarQuickButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  inlinePickerWrap: {
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  inlinePickerDoneButton: {
    height: 36,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  inlinePickerDoneButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
  },
  dateRow: {
    gap: 10,
    paddingRight: 8,
  },
  dateChip: {
    width: 62,
    height: 70,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceTint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dateChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dateChipDay: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1,
    fontWeight: "800",
    color: theme.colors.textSoft,
  },
  dateChipDayActive: {
    color: theme.colors.textOnPrimaryMuted,
  },
  dateChipDate: {
    color: theme.colors.text,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "900",
  },
  dateChipDateActive: {
    color: theme.colors.surface,
  },
  playersRow: {
    flexDirection: "row",
    gap: 10,
  },
  playerChip: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  playerChipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentSoft,
  },
  playerChipText: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
  },
  playerChipTextActive: {
    color: theme.colors.accentWarm,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodPill: {
    backgroundColor: theme.colors.surfaceTint,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  periodPillActive: {
    backgroundColor: theme.colors.success,
  },
  periodText: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  periodTextActive: {
    color: theme.colors.successText,
  },
  timeGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeChip: {
    width: "31%",
    height: 40,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  timeChipPast: {
    opacity: 0.4,
  },
  timeChipBooked: {
    backgroundColor: theme.colors.surfaceSoft,
    borderColor: theme.colors.borderStrong,
    opacity: 1,
  },
  timeChipText: {
    color: theme.colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  timeChipTextActive: {
    color: theme.colors.surface,
  },
  timeChipTextDisabled: {
    color: theme.colors.textSoft,
  },
  timeChipTextBooked: {
    color: theme.colors.muted,
  },
  timeChipStrike: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: theme.colors.muted,
    transform: [{ rotate: "-8deg" }],
  },
  summaryCard: {
    marginTop: 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    marginBottom: 10,
  },
  summaryMetaItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  summaryLabel: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
    marginTop: 1,
  },
  pricingSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
    gap: 8,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingName: {
    color: theme.colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  pricingAmount: {
    color: theme.colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
  },
  totalRow: {
    marginTop: 6,
  },
  totalLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  totalAmount: {
    color: theme.colors.primary,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "900",
  },
  confirmButton: {
    marginTop: 16,
    height: 54,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  policyText: {
    marginTop: 14,
    textAlign: "center",
    color: theme.colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight + 4,
    fontWeight: "500",
    paddingHorizontal: 8,
  },
});
