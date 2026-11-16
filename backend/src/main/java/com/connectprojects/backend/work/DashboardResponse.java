package com.connectprojects.backend.work;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        Map<String, Long> totals,
        List<ProjectResponse> projects,
        List<TaskResponse> tasks,
        List<ActivityResponse> activity,
        List<WorkloadResponse> workload
) {
    public record ActivityResponse(Long id, String who, String what, String target, Instant timestamp) {
    }

    public record WorkloadResponse(String name, long open) {
    }
}
