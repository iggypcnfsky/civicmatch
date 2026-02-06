"use client";

import { useState, useEffect } from "react";
import { Plus, Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import AddJobModal from "./AddJobModal";
import type { Job, JobRow, JobType } from "@/types/project";
import { JOB_TYPE_LABELS, JOB_TYPE_COLORS } from "@/types/project";

interface JobsPanelProps {
  projectId: string;
}

export default function JobsPanel({ projectId }: JobsPanelProps) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        
        if (jobsError) throw jobsError;
        
        const rows = (jobsData || []) as JobRow[];
        const mapped: Job[] = rows.map((row) => ({
          id: row.id,
          projectId: row.project_id,
          creatorId: row.creator_id,
          title: row.data.title,
          description: row.data.description,
          location: row.data.location,
          type: row.data.type,
          requirements: row.data.requirements,
          status: row.data.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        
        setJobs(mapped);
        
        // Auto-select first job if available
        if (mapped.length > 0 && !selectedJob) {
          setSelectedJob(mapped[0]);
        }

        // Check if user is admin/founder
        if (user) {
          const { data: memberData } = await supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single();
          
          setIsAdmin(memberData?.role === 'founder' || memberData?.role === 'admin');
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [projectId, user, selectedJob]);

  const handleAddJob = async (data: { 
    title: string; 
    description: string;
    location: string;
    type: JobType;
    requirements?: string;
  }) => {
    if (!user) throw new Error("Not authenticated");
    
    const { data: newJob, error } = await supabase
      .from("jobs")
      .insert({
        project_id: projectId,
        creator_id: user.id,
        data: {
          title: data.title,
          description: data.description,
          location: data.location,
          type: data.type,
          requirements: data.requirements,
          status: 'open',
        },
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const row = newJob as JobRow;
    const mapped: Job = {
      id: row.id,
      projectId: row.project_id,
      creatorId: row.creator_id,
      title: row.data.title,
      description: row.data.description,
      location: row.data.location,
      type: row.data.type,
      requirements: row.data.requirements,
      status: row.data.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    
    setJobs((prev) => [mapped, ...prev]);
    setSelectedJob(mapped);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent)]"></div>
      </div>
    );
  }

  const openJobs = jobs.filter(j => j.status === 'open');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Jobs</h2>
          <p className="text-sm text-[color:var(--foreground)]/60 mt-1">
            {openJobs.length} open {openJobs.length === 1 ? "position" : "positions"}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Add a Job
          </button>
        )}
      </div>
      
      {/* Content */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
          {/* Left column - Job list */}
          <div className="lg:col-span-1 space-y-2 overflow-y-auto max-h-[600px] pr-2">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all
                  ${selectedJob?.id === job.id 
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/5 shadow-sm' 
                    : 'border-divider hover:border-[color:var(--foreground)]/20 hover:bg-[color:var(--muted)]/10'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[color:var(--foreground)] truncate">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${JOB_TYPE_COLORS[job.type]}`}>
                        {JOB_TYPE_LABELS[job.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-[color:var(--foreground)]/60">
                      <MapPin className="size-3" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  </div>
                  <ChevronRight className={`
                    size-4 flex-shrink-0 transition-transform
                    ${selectedJob?.id === job.id ? 'text-[color:var(--accent)]' : 'text-[color:var(--foreground)]/30'}
                  `} />
                </div>
              </button>
            ))}
          </div>
          
          {/* Right column - Job details */}
          <div className="lg:col-span-2 bg-[color:var(--muted)]/10 rounded-2xl p-6 overflow-y-auto max-h-[600px]">
            {selectedJob ? (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-semibold text-[color:var(--foreground)]">
                      {selectedJob.title}
                    </h3>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${JOB_TYPE_COLORS[selectedJob.type]}`}>
                      {JOB_TYPE_LABELS[selectedJob.type]}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[color:var(--foreground)]/60">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      <span>{selectedJob.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-4" />
                      <span>Posted {formatDate(selectedJob.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium text-[color:var(--foreground)]/80 mb-2">
                    About this role
                  </h4>
                  <div className="text-[color:var(--foreground)]/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </div>
                </div>
                
                {/* Requirements */}
                {selectedJob.requirements && (
                  <div>
                    <h4 className="text-sm font-medium text-[color:var(--foreground)]/80 mb-2">
                      Requirements
                    </h4>
                    <div className="text-[color:var(--foreground)]/70 text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedJob.requirements}
                    </div>
                  </div>
                )}
                
                {/* Apply button - placeholder for future functionality */}
                <div className="pt-4 border-t border-divider">
                  <button
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
                    onClick={() => {
                      // TODO: Implement application flow
                      alert('Application flow coming soon!');
                    }}
                  >
                    Apply for this position
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Briefcase className="size-12 text-[color:var(--foreground)]/20 mb-4" />
                <p className="text-[color:var(--foreground)]/50">
                  Select a job to view details
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[color:var(--muted)]/20 flex items-center justify-center mb-4">
            <Briefcase className="size-8 text-[color:var(--foreground)]/40" />
          </div>
          <h3 className="text-lg font-medium mb-2">No job listings yet</h3>
          <p className="text-sm text-[color:var(--foreground)]/60 max-w-sm mb-6">
            {isAdmin 
              ? "Post job opportunities to attract talented contributors to your project."
              : "Check back later for job opportunities from this project."
            }
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[color:var(--accent)] text-[color:var(--background)] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              Add First Job
            </button>
          )}
        </div>
      )}
      
      {/* Add modal */}
      <AddJobModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddJob}
      />
    </div>
  );
}
