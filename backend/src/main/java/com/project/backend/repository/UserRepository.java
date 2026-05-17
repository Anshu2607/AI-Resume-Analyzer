package com.project.backend.repository;

import com.project.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Find by email
    Optional<User> findByEmail(String email);

    // Find by username
    Optional<User> findByUsername(String username);

    // Find by either username or email
    Optional<User> findByUsernameOrEmail(
            String username,
            String email
    );

    // Check if email already exists
    boolean existsByEmail(String email);

    // Check if username already exists
    boolean existsByUsername(String username);
}