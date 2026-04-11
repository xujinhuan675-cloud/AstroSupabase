/// <reference path="../.astro/types.d.ts" />

type AuthUser = import('@supabase/supabase-js').User;

declare namespace App {
  interface Locals {
    user: AuthUser | null;
  }
}
