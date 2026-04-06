"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useLocation } from "react-router";
import { ChevronDown, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
export function RiskRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [houseFilter, setHouseFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showOutOfCycle, setShowOutOfCycle] = useState(false);
  const [risks, setRisks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHouseId, setUserHouseId] = useState(null);
  const [userHouseName, setUserHouseName] = useState("");
  const [allHousesData, setAllHouses] = useState([]);
  const [categories, setCategoriesState] = useState(["Clinical", "Operational", "Environmental", "Safety", "Administrative"]);
  const userRole = (localStorage.getItem("userRole") || "").toUpperCase();
  let user = { id: "", name: "" };
  try {
    const userStr = localStorage.getItem("user");
    user = userStr ? JSON.parse(userStr) : { id: "", name: "" };
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  const userId = user.id || localStorage.getItem("userId") || "";
  const userRoleDisplay = userRole || "USER";
  const prefillCreatedBy = user.name ? `${user.name} (${userRoleDisplay})` : "Current User";
  const [newRisk, setNewRisk] = useState({
    house: "",
    description: "",
    impact: "",
    category: "",
    severity: "Medium",
    dateIdentified: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    mitigation: "",
    rootCause: "",
    reviewDate: "",
    status: "Open",
    escalated: false,
    source: "Pulse",
    createdBy: prefillCreatedBy,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    updateHistory: []
  });
  const [outOfCycleRisk, setOutOfCycleRisk] = useState({
    house: "",
    description: "",
    category: "",
    severity: "High",
    reason: "",
    requiresImmediateReview: false,
    createdBy: prefillCreatedBy
  });
  useEffect(() => {
    loadRisks();
  }, []);
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("addRisk") === "true") {
      setShowAddRisk(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);
  const loadRisks = async () => {
    try {
      const housesRes = await apiClient.get("/houses?limit=100");
      const housesData = housesRes.data.data || housesRes.data || [];
      const allHouses = Array.isArray(housesData) ? housesData : [];
      setAllHouses(allHouses);
      let houseId = null;
      if (userRole === "REGISTERED_MANAGER" || userRole === "TEAM_LEADER") {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = hRes.data.data || hRes.data || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) {
          houseId = myHouse.id;
          setUserHouseId(myHouse.id);
          setUserHouseName(myHouse.name);
        }
      }
      try {
        const catRes = await apiClient.get("/risks/categories");
        const catData = catRes.data.data || catRes.data || [];
        const cats = catData.categories || catData.items || (Array.isArray(catData) ? catData : []);
        if (cats.length > 0) setCategoriesState(cats.map((c) => c.name));
      } catch {
      }
      const params = houseId ? `?house_id=${houseId}&limit=100` : "?limit=100";
      const rRes = await apiClient.get(`/risks${params}`);
      const rData = rRes.data.data || rRes.data || {};
      const rawRisks = rData.risks || rData.items || (Array.isArray(rData) ? rData : []);
      const mapped = rawRisks.map((r) => ({
        id: r.id,
        house: r.house_name || (r.house_id ? allHouses.find((h) => h.id === r.house_id)?.name : null) || userHouseName || "Unknown",
        description: r.title || r.description,
        impact: r.description || "",
        category: r.category_name || r.category || "General",
        severity: r.severity || "Medium",
        dateIdentified: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
        mitigation: r.metadata?.mitigation || "",
        rootCause: r.metadata?.rootCause || "",
        reviewDate: r.review_due_date ? new Date(r.review_due_date).toISOString().split("T")[0] : "",
        status: r.status || "Open",
        escalated: r.status === "escalated",
        source: r.metadata?.source || "Manual",
        createdBy: r.created_by_name || "",
        lastUpdated: r.updated_at ? new Date(r.updated_at).toISOString().split("T")[0] : "",
        updateHistory: []
      }));
      setRisks(mapped);
    } catch (error) {
      console.error("Failed to load risks:", error);
      toast.error("Failed to load risk register");
    } finally {
      setIsLoading(false);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const houses = ["All", ...allHousesData.map((h) => h.name)];
  const severities = ["All", "High", "Medium", "Low"];
  const statuses = ["All", "Open", "Under Review", "Escalated", "Closed"];
  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      if (houseFilter !== "All" && risk.house !== houseFilter) return false;
      if (severityFilter !== "All" && risk.severity !== severityFilter) return false;
      if (statusFilter !== "All" && risk.status !== statusFilter) return false;
      return true;
    });
  }, [risks, houseFilter, severityFilter, statusFilter]);
  const paginatedRisks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRisks.slice(start, start + itemsPerPage);
  }, [filteredRisks, currentPage]);
  const totalPages = Math.ceil(filteredRisks.length / itemsPerPage);
  const risksTable = useMemo(() => /* @__PURE__ */ jsxs("div", { className: "bg-card border-2 border-border shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse", children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-primary text-primary-foreground text-sm whitespace-nowrap", children: [
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "House" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Description" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Category" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Severity" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Date Identified" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Source" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Mitigation" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-center font-semibold", children: "Escalated" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "border-b border-gray-300 px-4 py-3 text-left font-semibold", children: "Review Date" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: paginatedRisks.map((risk, idx) => /* @__PURE__ */ jsxs(
        "tr",
        {
          onClick: () => navigate(`/risk-register/${risk.id}`),
          className: `cursor-pointer transition-colors text-sm ${idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}`,
          children: [
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 whitespace-nowrap", children: risk.house }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 min-w-[200px] max-w-sm truncate", title: risk.description, children: risk.description }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 whitespace-nowrap", children: risk.category }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-border px-4 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: `inline-block px-2 py-1 text-xs font-medium ${risk.severity === "High" || risk.severity === "Critical" ? "bg-destructive text-destructive-foreground" : risk.severity === "Medium" ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"}`,
                children: risk.severity
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 whitespace-nowrap", children: risk.dateIdentified }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 whitespace-nowrap", children: getSourceBadge(risk.source) }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 min-w-[200px] max-w-sm truncate", title: risk.mitigation, children: risk.mitigation }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-border px-4 py-4 text-center whitespace-nowrap", children: /* @__PURE__ */ jsx("span", { className: `inline-block px-2 py-1 text-xs font-medium ${risk.escalated ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"}`, children: risk.escalated ? "Yes" : "-" }) }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-border px-4 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsx(
              "span",
              {
                className: `inline-block px-2 py-1 text-xs font-medium border border-border ${risk.status === "Open" ? "text-primary" : risk.status === "In Progress" || risk.status === "Under Review" ? "bg-muted text-muted-foreground" : risk.status === "Escalated" ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}`,
                children: risk.status
              }
            ) }),
            /* @__PURE__ */ jsx("td", { className: "border-b border-gray-200 px-4 py-4 whitespace-nowrap text-gray-600 font-medium", children: risk.reviewDate })
          ]
        },
        risk.id
      )) })
    ] }) }),
    totalPages > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50 text-sm", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-gray-500", children: [
        "Showing ",
        (currentPage - 1) * itemsPerPage + 1,
        " to ",
        Math.min(currentPage * itemsPerPage, filteredRisks.length),
        " of ",
        filteredRisks.length,
        " risks"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            disabled: currentPage === 1,
            onClick: (e) => {
              e.stopPropagation();
              setCurrentPage((prev) => Math.max(prev - 1, 1));
            },
            className: "px-3 py-1 bg-white border border-border text-gray-700 rounded disabled:opacity-50 hover:bg-gray-50 transition-colors",
            children: "Previous"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            disabled: currentPage === totalPages,
            onClick: (e) => {
              e.stopPropagation();
              setCurrentPage((prev) => Math.min(prev + 1, totalPages));
            },
            className: "px-3 py-1 bg-white border border-border text-gray-700 rounded disabled:opacity-50 hover:bg-gray-50 transition-colors",
            children: "Next"
          }
        )
      ] })
    ] })
  ] }), [paginatedRisks, currentPage, totalPages, filteredRisks.length, navigate]);
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background flex items-center justify-center", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "Loading risk register..." })
    ] }) });
  }
  const handleAddRisk = async () => {
    if (!newRisk.description) {
      toast.error("Please enter a risk description");
      return;
    }
    const isScopedRole = userRole === "REGISTERED_MANAGER" || userRole === "TEAM_LEADER";
    const targetHouseId = isScopedRole ? userHouseId : newRisk.house;
    if (!targetHouseId) {
      toast.error("House information required");
      return;
    }
    setIsSubmitting(true);
    try {
      const reviewDue = newRisk.reviewDate ? new Date(newRisk.reviewDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
      await apiClient.post("/risks", {
        house_id: targetHouseId,
        title: newRisk.description,
        description: newRisk.impact || newRisk.description,
        severity: newRisk.severity || "Medium",
        status: "Open",
        likelihood: 3,
        impact: 3,
        review_due_date: reviewDue,
        metadata: {
          mitigation: newRisk.mitigation,
          rootCause: newRisk.rootCause,
          category: newRisk.category,
          source: "Manual"
        }
      });
      toast.success("Risk added successfully");
      setShowAddRisk(false);
      setNewRisk({ house: "", description: "", impact: "", category: "", severity: "Medium", dateIdentified: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], mitigation: "", rootCause: "", reviewDate: "", status: "Open", escalated: false, source: "Pulse", createdBy: prefillCreatedBy, lastUpdated: "", updateHistory: [] });
      loadRisks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add risk");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleOutOfCycleRisk = async () => {
    if (!outOfCycleRisk.description || !outOfCycleRisk.reason) {
      toast.error("Please fill in description and reason");
      return;
    }
    const isScopedRole = userRole === "REGISTERED_MANAGER" || userRole === "TEAM_LEADER";
    const targetHouseId = isScopedRole ? userHouseId : outOfCycleRisk.house;
    if (!targetHouseId) {
      toast.error("House information required");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/risks", {
        house_id: targetHouseId,
        title: outOfCycleRisk.description,
        description: `[Out-of-Cycle] ${outOfCycleRisk.description}. Reason: ${outOfCycleRisk.reason}`,
        severity: outOfCycleRisk.severity || "Medium",
        status: "Open",
        likelihood: 4,
        impact: 4,
        metadata: {
          source: "Out-of-Cycle",
          requiresImmediateReview: outOfCycleRisk.requiresImmediateReview,
          category: outOfCycleRisk.category,
          reason: outOfCycleRisk.reason
        }
      });
      toast.success("Out-of-cycle risk created \u2014 will appear in next Pulse review");
      setShowOutOfCycle(false);
      setOutOfCycleRisk({ house: "", description: "", category: "", severity: "high", reason: "", requiresImmediateReview: false, createdBy: prefillCreatedBy });
      loadRisks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create out-of-cycle risk");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getSourceBadge = (source) => {
    switch (source) {
      case "Pulse":
        return /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-muted border border-border text-xs text-foreground", children: "Pulse" });
      case "Out-of-Cycle":
        return /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-primary text-primary-foreground text-xs", children: "Out-of-Cycle" });
      case "Manual":
        return /* @__PURE__ */ jsx("span", { className: "px-2 py-1 border border-border text-xs text-muted-foreground", children: "Manual" });
      default:
        return /* @__PURE__ */ jsx("span", { className: "px-2 py-1 border border-border text-xs text-muted-foreground", children: source });
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-background", children: [
    /* @__PURE__ */ jsx(RoleBasedNavigation, {}),
    /* @__PURE__ */ jsxs("div", { className: "p-6 w-full pt-20", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-6 flex justify-between items-start", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-3xl font-semibold text-primary", children: "Risk Register" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "Live register of all identified risks" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2 flex gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Pulse-originated risks are created through Governance Pulse rhythm" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "\u2022" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: "Out-of-cycle for urgent incidents" })
          ] })
        ] }),
        ["REGISTERED_MANAGER", "TEAM_LEADER"].includes(userRole) && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setShowOutOfCycle(true),
              className: "flex items-center gap-2 px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors",
              children: [
                /* @__PURE__ */ jsx(AlertTriangle, { className: "w-4 h-4 text-warning" }),
                "Out-of-Cycle Risk"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setShowAddRisk(true),
              className: "flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium shadow-sm",
              children: [
                /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
                "Add Risk"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-card border-2 border-border p-6 mb-6 shadow-sm", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-foreground font-medium", children: "Filter by House" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: houseFilter,
                onChange: (e) => setHouseFilter(e.target.value),
                className: "w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer",
                children: houses.map((house) => /* @__PURE__ */ jsx("option", { value: house, children: house }, house))
              }
            ),
            /* @__PURE__ */ jsx(ChevronDown, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-foreground font-medium", children: "Filter by Severity" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: severityFilter,
                onChange: (e) => setSeverityFilter(e.target.value),
                className: "w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer",
                children: severities.map((severity) => /* @__PURE__ */ jsx("option", { value: severity, children: severity }, severity))
              }
            ),
            /* @__PURE__ */ jsx(ChevronDown, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-foreground font-medium", children: "Filter by Status" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              "select",
              {
                value: statusFilter,
                onChange: (e) => setStatusFilter(e.target.value),
                className: "w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer",
                children: statuses.map((status) => /* @__PURE__ */ jsx("option", { value: status, children: status }, status))
              }
            ),
            /* @__PURE__ */ jsx(ChevronDown, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" })
          ] })
        ] })
      ] }) }),
      risksTable
    ] }),
    showAddRisk && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 backdrop-blur-sm bg-background/80 flex items-center justify-center z-50", children: /* @__PURE__ */ jsxs("div", { className: "bg-card border-2 border-border p-6 w-full max-w-2xl max-h-screen overflow-y-auto shadow-xl", children: [
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold mb-4 text-primary", children: "Add New Risk" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "House" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: newRisk.house,
              onChange: (e) => setNewRisk({ ...newRisk, house: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select house" }),
                allHousesData.map((house) => /* @__PURE__ */ jsx("option", { value: house.id, children: house.name }, house.id))
              ]
            }
          ),
          (userRole === "REGISTERED_MANAGER" || userRole === "TEAM_LEADER") && /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Only your assigned house is available" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Risk Title" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: newRisk.description,
              onChange: (e) => setNewRisk({ ...newRisk, description: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Reported By" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: newRisk.createdBy || "",
              onChange: (e) => setNewRisk({ ...newRisk, createdBy: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Category" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: newRisk.category,
              onChange: (e) => setNewRisk({ ...newRisk, category: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select category" }),
                categories.map((category) => /* @__PURE__ */ jsx("option", { value: category, children: category }, category))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Severity" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: newRisk.severity,
              onChange: (e) => setNewRisk({ ...newRisk, severity: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "Critical", children: "Critical" }),
                /* @__PURE__ */ jsx("option", { value: "High", children: "High" }),
                /* @__PURE__ */ jsx("option", { value: "Medium", children: "Medium" }),
                /* @__PURE__ */ jsx("option", { value: "Low", children: "Low" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Date Identified" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "date",
              value: newRisk.dateIdentified,
              onChange: (e) => setNewRisk({ ...newRisk, dateIdentified: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Description" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: newRisk.description,
            onChange: (e) => setNewRisk({ ...newRisk, description: e.target.value }),
            className: "w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Detailed description of the risk..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Impact" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: newRisk.impact || "",
            onChange: (e) => setNewRisk({ ...newRisk, impact: e.target.value }),
            className: "w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Potential impact on residents, operations, compliance..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Mitigation Plan" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: newRisk.mitigation,
            onChange: (e) => setNewRisk({ ...newRisk, mitigation: e.target.value }),
            className: "w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Immediate and long-term mitigation actions..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Root Cause Analysis" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: newRisk.rootCause || "",
            onChange: (e) => setNewRisk({ ...newRisk, rootCause: e.target.value }),
            className: "w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Underlying causes contributing to this risk..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowAddRisk(false),
            className: "px-6 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleAddRisk,
            disabled: isSubmitting,
            className: "px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50",
            children: isSubmitting ? "Adding..." : "Add Risk"
          }
        )
      ] })
    ] }) }),
    showOutOfCycle && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border-2 border-black p-6 w-full max-w-2xl max-h-screen overflow-y-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "w-6 h-6 text-black" }),
        /* @__PURE__ */ jsx("h2", { className: "text-xl font-semibold text-black", children: "Create Out-of-Cycle Risk" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "bg-gray-50 border-2 border-gray-300 p-4 mb-4", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600", children: "Use this only for serious incidents or safeguarding events that occur between Governance Pulses. This risk will be flagged for mandatory review at the next scheduled Pulse." }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4 mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "House" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: outOfCycleRisk.house,
              onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, house: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select house" }),
                allHousesData.map((house) => /* @__PURE__ */ jsx("option", { value: house.id, children: house.name }, house.id))
              ]
            }
          ),
          (userRole === "REGISTERED_MANAGER" || userRole === "TEAM_LEADER") && /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Only your assigned house is available" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Category" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: outOfCycleRisk.category,
              onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, category: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select category" }),
                categories.map((category) => /* @__PURE__ */ jsx("option", { value: category, children: category }, category))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Severity" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: outOfCycleRisk.severity,
              onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, severity: e.target.value }),
              className: "w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black",
              children: [
                /* @__PURE__ */ jsx("option", { value: "Critical", children: "Critical" }),
                /* @__PURE__ */ jsx("option", { value: "High", children: "High" }),
                /* @__PURE__ */ jsx("option", { value: "Medium", children: "Medium" }),
                /* @__PURE__ */ jsx("option", { value: "Low", children: "Low" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Risk Description" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: outOfCycleRisk.description,
            onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, description: e.target.value }),
            className: "w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Describe the incident or concern..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
        /* @__PURE__ */ jsx("label", { className: "block mb-2 text-black font-medium", children: "Reason for Out-of-Cycle Creation" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: outOfCycleRisk.reason,
            onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, reason: e.target.value }),
            className: "w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none",
            placeholder: "Explain why this risk requires immediate creation outside the normal Pulse rhythm..."
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mb-4", children: /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: outOfCycleRisk.requiresImmediateReview,
            onChange: (e) => setOutOfCycleRisk({ ...outOfCycleRisk, requiresImmediateReview: e.target.checked }),
            className: "w-4 h-4 border-2 border-black"
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "text-black font-medium", children: "Requires immediate review at next Pulse" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setShowOutOfCycle(false),
            className: "px-6 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors",
            children: "Cancel"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleOutOfCycleRisk,
            disabled: isSubmitting,
            className: "px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50",
            children: isSubmitting ? "Creating..." : "Create Out-of-Cycle Risk"
          }
        )
      ] })
    ] }) })
  ] });
}
