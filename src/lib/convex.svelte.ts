import { ConvexClient } from "convex/browser";
import type { FunctionReference, FunctionReturnType, FunctionArgs } from "convex/server";

// Hent Convex URL fra miljøvariabler (settes automatisk av npx convex dev i .env.local)
export const convexUrl: string =
  ((import.meta as any).env?.VITE_CONVEX_URL as string) || "https://placeholder-url.convex.cloud";

export const convexClient = new ConvexClient(convexUrl);

/**
 * Svelte 5 Runes-basert reaktiv hook for Convex queries
 * Bruker $state og $effect med ConvexClient.onUpdate for automatisk sanntids-synkronisering.
 */
export function useQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: () => FunctionArgs<Query> | undefined = () => ({} as FunctionArgs<Query>)
) {
  let data = $state<FunctionReturnType<Query> | undefined>(undefined);
  let isLoading = $state<boolean>(true);
  let error = $state<Error | null>(null);

  $effect(() => {
    const currentArgs = args();
    if (currentArgs === undefined) {
      data = undefined;
      isLoading = false;
      return;
    }

    isLoading = true;
    error = null;

    const unsubscribe = convexClient.onUpdate(
      query,
      currentArgs,
      (result) => {
        data = result;
        isLoading = false;
        error = null;
      },
      (err) => {
        error = err;
        isLoading = false;
      }
    );

    return () => {
      unsubscribe();
    };
  });

  return {
    get data() {
      return data;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
  };
}

/**
 * Svelte 5 Runes-basert helper for Convex mutations
 */
export function useMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation
) {
  let isPending = $state<boolean>(false);
  let error = $state<Error | null>(null);

  async function mutate(
    args: FunctionArgs<Mutation>
  ): Promise<FunctionReturnType<Mutation>> {
    isPending = true;
    error = null;
    try {
      const res = await convexClient.mutation(mutation, args);
      return res;
    } catch (e: any) {
      error = e instanceof Error ? e : new Error(String(e));
      throw error;
    } finally {
      isPending = false;
    }
  }

  return {
    mutate,
    get isPending() {
      return isPending;
    },
    get error() {
      return error;
    },
  };
}

/**
 * Svelte 5 Runes-basert helper for Convex actions
 */
export function useAction<Action extends FunctionReference<"action">>(
  action: Action
) {
  let isPending = $state<boolean>(false);
  let error = $state<Error | null>(null);

  async function execute(
    args: FunctionArgs<Action>
  ): Promise<FunctionReturnType<Action>> {
    isPending = true;
    error = null;
    try {
      const res = await convexClient.action(action, args);
      return res;
    } catch (e: any) {
      error = e instanceof Error ? e : new Error(String(e));
      throw error;
    } finally {
      isPending = false;
    }
  }

  return {
    execute,
    get isPending() {
      return isPending;
    },
    get error() {
      return error;
    },
  };
}
