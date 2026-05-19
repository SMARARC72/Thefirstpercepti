// ============================================================================
// FACTION REACTIONS — Dynamic faction responses
// ============================================================================

=== faction_reaction ===
{ get_faction_trust("drowned_court") < -20:
    -> fc_hostile
}

{ get_faction_trust("drowned_court") > 20:
    -> fc_friendly
}

-> fc_neutral

=== fc_hostile ===
The Drowned Court has marked you. You notice watchers at the fountain's edge, too still to be casual.

~ world_danger = world_danger + 5

-> DONE

=== fc_friendly ===
A court agent approaches openly. "The Court extends protection to those who understand the value of silence."

-> DONE

=== fc_neutral ===
The Court observes. They have not decided what you are yet.

-> DONE
