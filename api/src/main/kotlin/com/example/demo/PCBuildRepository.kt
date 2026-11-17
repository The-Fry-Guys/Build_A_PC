package com.example.demo

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PCBuildRepository : JpaRepository<PCBuild, UUID> {
    /** Returns a user's builds whose names contain the requested search text. */
    fun findAllByUserIdAndNameContainingIgnoreCase(userId: UUID, name: String, pageable: Pageable): Page<PCBuild>

    fun findAllByUserId(userId: UUID, pageable: Pageable): Page<PCBuild>
    fun deleteByUserId(userId: UUID)
}
